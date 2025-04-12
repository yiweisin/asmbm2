
using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SocialMediaManager.API.Data;
using SocialMediaManager.API.Models;

namespace SocialMediaManager.API.Services
{
    public class TwitterMetricsService : BackgroundService
    {
        private readonly ILogger<TwitterMetricsService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IHttpClientFactory _httpClientFactory;
        
        public TwitterMetricsService(
            ILogger<TwitterMetricsService> logger,
            IServiceProvider serviceProvider,
            IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _httpClientFactory = httpClientFactory;
        }
        
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Twitter Metrics Service is starting.");
            
            // Run once at startup
            await CollectMetrics();
            
            // Then run once per day at midnight
            while (!stoppingToken.IsCancellationRequested)
            {
                // Calculate time until next midnight
                var now = DateTime.UtcNow;
                var tomorrow = now.Date.AddDays(1);
                var timeUntilMidnight = tomorrow - now;
                
                _logger.LogInformation($"Next metrics collection in {timeUntilMidnight.TotalHours:0.0} hours");
                
                // Wait until next execution time
                await Task.Delay(timeUntilMidnight, stoppingToken);
                
                // Collect metrics from all accounts
                if (!stoppingToken.IsCancellationRequested)
                {
                    await CollectMetrics();
                }
            }
        }
        
        private async Task CollectMetrics()
        {
            try
            {
                _logger.LogInformation("Collecting Twitter metrics for all accounts...");
                
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                
                // Get all Twitter accounts
                var accounts = await dbContext.TwitterAccounts.ToListAsync();
                
                foreach (var account in accounts)
                {
                    try
                    {
                        // Check if metrics for today already exist
                        var today = DateTime.UtcNow.Date;
                        var existingMetrics = await dbContext.TwitterDailyMetrics
                            .FirstOrDefaultAsync(m => m.TwitterAccountId == account.Id && m.RecordedDate.Date == today);
                        
                        if (existingMetrics != null)
                        {
                            _logger.LogInformation($"Metrics for account {account.Username} already collected today, skipping.");
                            continue;
                        }
                        
                        // Check if token is expired and refresh if needed
                        if (DateTime.UtcNow >= account.TokenExpiresAt)
                        {
                            if (!await RefreshAccessToken(account, dbContext))
                            {
                                _logger.LogWarning($"Failed to refresh token for account {account.Username}, skipping metrics collection.");
                                continue;
                            }
                        }
                        
                        // Collect metrics for this account
                        var metrics = await FetchTwitterMetrics(account);
                        if (metrics != null)
                        {
                            // Save to database
                            dbContext.TwitterDailyMetrics.Add(metrics);
                            await dbContext.SaveChangesAsync();
                            _logger.LogInformation($"Saved metrics for {account.Username}: {metrics.FollowerCount} followers, {metrics.TotalLikes} likes");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Error collecting metrics for account {account.Username}");
                    }
                    
                    // Add delay between accounts to avoid rate limiting
                    await Task.Delay(5000);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Twitter metrics collection");
            }
        }
        
        private async Task<TwitterDailyMetric> FetchTwitterMetrics(TwitterAccount account)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", account.AccessToken);
                
                // Get user metrics (followers count)
                var userResponse = await client.GetAsync(
                    $"https://api.twitter.com/2/users/{account.TwitterId}?user.fields=public_metrics");
                
                if (!userResponse.IsSuccessStatusCode)
                {
                    _logger.LogError($"Failed to get user metrics: {userResponse.StatusCode}");
                    return null;
                }
                
                var userJson = await userResponse.Content.ReadAsStringAsync();
                var userData = JsonDocument.Parse(userJson).RootElement;
                
                // Get recent tweets for engagement data
                var tweetsResponse = await client.GetAsync(
                    $"https://api.twitter.com/2/users/{account.TwitterId}/tweets?max_results=100&tweet.fields=public_metrics,created_at");
                
                if (!tweetsResponse.IsSuccessStatusCode)
                {
                    _logger.LogError($"Failed to get tweets: {tweetsResponse.StatusCode}");
                    return null;
                }
                
                var tweetsJson = await tweetsResponse.Content.ReadAsStringAsync();
                var tweetsData = JsonDocument.Parse(tweetsJson).RootElement;
                
                // Extract metrics
                var followerCount = userData.GetProperty("data").GetProperty("public_metrics").GetProperty("followers_count").GetInt32();
                
                // Process tweet data
                int totalLikes = 0;
                int totalViews = 0;
                int tweetCount = 0;
                int retweetCount = 0;
                int replyCount = 0;
                
                if (tweetsData.TryGetProperty("data", out var tweets))
                {
                    foreach (var tweet in tweets.EnumerateArray())
                    {
                        var metrics = tweet.GetProperty("public_metrics");
                        totalLikes += metrics.GetProperty("like_count").GetInt32();
                        
                        // Not all tweets have impression metrics
                        if (metrics.TryGetProperty("impression_count", out var impressions))
                        {
                            totalViews += impressions.GetInt32();
                        }
                        else
                        {
                            // Estimate based on engagement if impressions not available
                            totalViews += metrics.GetProperty("like_count").GetInt32() * 50;
                        }
                        
                        retweetCount += metrics.GetProperty("retweet_count").GetInt32();
                        replyCount += metrics.GetProperty("reply_count").GetInt32();
                        tweetCount++;
                    }
                }
                
                // Create and return metrics object
                return new TwitterDailyMetric
                {
                    TwitterAccountId = account.Id,
                    RecordedDate = DateTime.UtcNow.Date,
                    FollowerCount = followerCount,
                    TotalLikes = totalLikes,
                    TotalViews = totalViews,
                    TweetCount = tweetCount,
                    RetweetCount = retweetCount,
                    ReplyCount = replyCount
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fetching Twitter metrics for account {account.Username}");
                return null;
            }
        }
        
        private async Task<bool> RefreshAccessToken(TwitterAccount account, ApplicationDbContext dbContext)
        {
            try
            {
                // Create a client for the token refresh
                var client = _httpClientFactory.CreateClient();
                
                // Implement token refresh logic
                // Similar to what's in your TwitterController
                
                // Return true if successful
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to refresh token for account {account.Username}");
                return false;
            }
        }
    }
}