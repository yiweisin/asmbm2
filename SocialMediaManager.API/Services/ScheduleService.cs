using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SocialMediaManager.API.Data;
using SocialMediaManager.API.Models;

namespace SocialMediaManager.API.Services
{
    public class SchedulerService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<SchedulerService> _logger;
        private readonly IConfiguration _configuration;
        private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);
        private static readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1);
        
        // Define UTC+8 time zone offset
        private static readonly TimeSpan _utc8Offset = TimeSpan.FromHours(8);
        
        public SchedulerService(
            IServiceProvider serviceProvider,
            ILogger<SchedulerService> logger,
            IConfiguration configuration)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _configuration = configuration;
        }
        
        // Convert UTC time to UTC+8
        private DateTime ToUtc8(DateTime utcTime)
        {
            return utcTime.Add(_utc8Offset);
        }
        
        // Convert UTC+8 time to UTC
        private DateTime FromUtc8(DateTime utc8Time)
        {
            return utc8Time.Subtract(_utc8Offset);
        }
        
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Scheduler Service is starting. Checking for posts every minute. Using UTC+8 timezone.");
            
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Use semaphore to ensure only one instance runs at a time
                    if (await _semaphore.WaitAsync(0))
                    {
                        try
                        {
                            await ProcessScheduledPosts();
                        }
                        finally
                        {
                            _semaphore.Release();
                        }
                    }
                    else
                    {
                        _logger.LogInformation("Skipping processing cycle as another one is already in progress");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while processing scheduled posts.");
                }
                
                await Task.Delay(_checkInterval, stoppingToken);
            }
            
            _logger.LogInformation("Scheduler Service is stopping.");
        }
        
        private async Task ProcessScheduledPosts()
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                using var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                using var httpClient = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>().CreateClient();
                
                // Get current time in UTC
                var now = DateTime.UtcNow;
                
                // Log current time in both UTC and UTC+8
                _logger.LogInformation($"Current time - UTC: {now:yyyy-MM-dd HH:mm:ss}, UTC+8: {ToUtc8(now):yyyy-MM-dd HH:mm:ss}");
                
                // Get posts that are scheduled and due
                var posts = await dbContext.ScheduledPosts
                    .Where(p => p.Status == "scheduled" && p.ScheduledTime <= now)
                    .ToListAsync();
                    
                _logger.LogInformation($"Found {posts.Count} scheduled posts to process.");
                
                if (posts.Count == 0)
                {
                    return;
                }
                
                // Process each post
                foreach (var post in posts)
                {
                    try
                    {
                        // Log the post's scheduled time in both UTC and UTC+8
                        _logger.LogInformation($"Processing post ID {post.Id} - Scheduled time UTC: {post.ScheduledTime:yyyy-MM-dd HH:mm:ss}, UTC+8: {ToUtc8(post.ScheduledTime):yyyy-MM-dd HH:mm:ss}");
                        
                        // CRITICAL: Ensure ErrorMessage is never null
                        if (post.ErrorMessage == null)
                        {
                            post.ErrorMessage = "";
                        }
                        
                        bool success = false;
                        
                        switch (post.Platform.ToLower())
                        {
                            case "twitter":
                                success = await ProcessTwitterPost(dbContext, httpClient, post);
                                break;
                            case "discord":
                                success = await ProcessDiscordPost(httpClient, post);
                                break;
                            case "telegram":
                                success = await ProcessTelegramPost(dbContext, httpClient, post);
                                break;
                            default:
                                _logger.LogWarning($"Unknown platform '{post.Platform}' for post ID {post.Id}");
                                post.Status = "failed";
                                post.ErrorMessage = $"Unknown platform: {post.Platform}";
                                break;
                        }
                        
                        // Update post status
                        if (success)
                        {
                            post.Status = "completed";
                            post.PostedTime = DateTime.UtcNow;
                            post.ErrorMessage = ""; // CRITICAL: Use empty string
                            _logger.LogInformation($"Successfully processed post ID {post.Id} for platform {post.Platform}");
                            
                            // Log posted time in both UTC and UTC+8
                            _logger.LogInformation($"Post ID {post.Id} posted at - UTC: {post.PostedTime:yyyy-MM-dd HH:mm:ss}, UTC+8: {ToUtc8(post.PostedTime.Value):yyyy-MM-dd HH:mm:ss}");
                        }
                        else if (post.Status != "failed") // Only set if not already set
                        {
                            post.Status = "failed";
                            post.ErrorMessage = string.IsNullOrEmpty(post.ErrorMessage) ? "Unknown error" : post.ErrorMessage;
                            _logger.LogWarning($"Failed to process post ID {post.Id} for platform {post.Platform}: {post.ErrorMessage}");
                        }
                        
                        // Save changes for this post immediately
                        await dbContext.SaveChangesAsync();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Error processing scheduled post ID {post.Id}");
                        try
                        {
                            post.Status = "failed";
                            post.ErrorMessage = ex.Message ?? "Error processing post";
                            
                            // CRITICAL: Double-check ErrorMessage is never null
                            if (post.ErrorMessage == null)
                            {
                                post.ErrorMessage = "Unknown error occurred";
                            }
                            
                            await dbContext.SaveChangesAsync();
                        }
                        catch (Exception saveEx)
                        {
                            _logger.LogError(saveEx, $"Error saving status update for post ID {post.Id}");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Critical error in ProcessScheduledPosts");
            }
        }
        
        private async Task<bool> ProcessTwitterPost(ApplicationDbContext dbContext, HttpClient httpClient, ScheduledPost post)
        {
            // Get Twitter account
            var account = await dbContext.TwitterAccounts
                .FirstOrDefaultAsync(a => a.Id == post.PlatformAccountId);
                
            if (account == null)
            {
                post.ErrorMessage = "Twitter account not found";
                return false;
            }
            
            // Check if token is expired and refresh if needed
            if (DateTime.UtcNow >= account.TokenExpiresAt)
            {
                if (!await RefreshTwitterToken(dbContext, httpClient, account))
                {
                    post.ErrorMessage = "Failed to refresh Twitter token";
                    return false;
                }
            }
            
            // Send tweet
            httpClient.DefaultRequestHeaders.Clear();
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", account.AccessToken);
            
            var tweetContent = new
            {
                text = post.Content
            };
            
            var json = JsonSerializer.Serialize(tweetContent);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            var response = await httpClient.PostAsync("https://api.twitter.com/2/tweets", content);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError($"Twitter API error: {errorContent}");
                post.ErrorMessage = $"Twitter API error: {response.StatusCode} - {errorContent}";
                return false;
            }
            
            return true;
        }
        
        private async Task<bool> ProcessDiscordPost(HttpClient httpClient, ScheduledPost post)
        {
            if (string.IsNullOrEmpty(post.TargetId))
            {
                post.ErrorMessage = "Target channel ID is required for Discord posts";
                return false;
            }
            
            // We're using a Bot token from configuration rather than user accounts
            var botToken = _configuration["Discord:BotToken"];
            
            if (string.IsNullOrEmpty(botToken))
            {
                post.ErrorMessage = "Discord bot token is not configured";
                return false;
            }
            
            // Send message
            httpClient.DefaultRequestHeaders.Clear();
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bot", botToken);
            
            var messageContent = new
            {
                content = post.Content
            };
            
            var json = JsonSerializer.Serialize(messageContent);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            var response = await httpClient.PostAsync($"https://discord.com/api/channels/{post.TargetId}/messages", content);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError($"Discord API error: {errorContent}");
                post.ErrorMessage = $"Discord API error: {response.StatusCode} - {errorContent}";
                return false;
            }
            
            return true;
        }
        
        private async Task<bool> ProcessTelegramPost(ApplicationDbContext dbContext, HttpClient httpClient, ScheduledPost post)
        {
            if (string.IsNullOrEmpty(post.TargetId))
            {
                post.ErrorMessage = "Target chat ID is required for Telegram posts";
                return false;
            }
            
            // Get Telegram account
            var account = await dbContext.TelegramAccounts
                .FirstOrDefaultAsync(a => a.Id == post.PlatformAccountId);
                
            if (account == null)
            {
                post.ErrorMessage = "Telegram account not found";
                return false;
            }
            
            // Send message
            var response = await httpClient.GetAsync(
                $"https://api.telegram.org/bot{account.BotToken}/sendMessage?chat_id={post.TargetId}&text={Uri.EscapeDataString(post.Content)}"
            );
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError($"Telegram API error: {errorContent}");
                post.ErrorMessage = $"Telegram API error: {response.StatusCode} - {errorContent}";
                return false;
            }
            
            return true;
        }
        
        private async Task<bool> RefreshTwitterToken(ApplicationDbContext dbContext, HttpClient httpClient, TwitterAccount account)
        {
            try
            {
                // Set up Basic Authentication
                var clientId = _configuration["Twitter:ClientId"];
                var clientSecret = _configuration["Twitter:ClientSecret"];
                var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{clientId}:{clientSecret}"));
                
                httpClient.DefaultRequestHeaders.Clear();
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);
                
                // Create form content for the refresh request
                var formData = new[]
                {
                    new KeyValuePair<string, string>("grant_type", "refresh_token"),
                    new KeyValuePair<string, string>("refresh_token", account.RefreshToken)
                };
                
                var content = new FormUrlEncodedContent(formData);
                
                // Make the request
                var response = await httpClient.PostAsync("https://api.twitter.com/2/oauth2/token", content);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"Twitter token refresh error: {errorContent}");
                    return false;
                }
                
                var responseContent = await response.Content.ReadAsStringAsync();
                var tokenData = JsonSerializer.Deserialize<JsonElement>(responseContent);
                
                // Update the account with new tokens
                account.AccessToken = tokenData.GetProperty("access_token").GetString();
                account.RefreshToken = tokenData.GetProperty("refresh_token").GetString();
                account.TokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenData.GetProperty("expires_in").GetInt32());
                
                // Save the token update immediately
                await dbContext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing Twitter token");
                return false;
            }
        }
    }
}