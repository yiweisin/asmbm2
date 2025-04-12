using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SocialMediaManager.API.Data;
using SocialMediaManager.API.DTOs;
using SocialMediaManager.API.Models;

namespace SocialMediaManager.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TwitterController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;
        
        public TwitterController(ApplicationDbContext context, IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
        }
        
        [HttpGet("accounts")]
        public async Task<IActionResult> GetAccounts()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            var accounts = await _context.TwitterAccounts
                .Where(a => a.UserId == userId)
                .Select(a => new TwitterAccountDTO
                {
                    Id = a.Id,
                    TwitterId = a.TwitterId,
                    Username = a.Username
                })
                .ToListAsync();
                
            return Ok(accounts);
        }
        
        [HttpPost("connect")]
        public async Task<IActionResult> Connect(TwitterConnectDTO connectDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            try
            {
                // Exchange code for access token
                var tokenEndpoint = "https://api.twitter.com/2/oauth2/token";
                
                // Create a fresh HTTP client for this request
                var client = _httpClientFactory.CreateClient();
                
                // Set up Basic Authentication
                var clientId = _configuration["Twitter:ClientId"];
                var clientSecret = _configuration["Twitter:ClientSecret"];
                var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{clientId}:{clientSecret}"));
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);
                
                // Create form content instead of JSON
                var formContent = new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    { "grant_type", "authorization_code" },
                    { "code", connectDto.Code },
                    { "redirect_uri", connectDto.RedirectUri },
                    { "code_verifier", connectDto.CodeVerifier }
                });
                
                // Log request details for debugging
                Console.WriteLine($"Twitter auth request to {tokenEndpoint}");
                Console.WriteLine($"Using client ID: {clientId}");
                Console.WriteLine($"Form data: code={connectDto.Code}, redirect_uri={connectDto.RedirectUri}");
                
                // Make the request
                var tokenResponse = await client.PostAsync(tokenEndpoint, formContent);
                
                // Process the successful response
                var responseContent = await tokenResponse.Content.ReadAsStringAsync();
                
                var tokenData = JsonSerializer.Deserialize<JsonElement>(responseContent);
                var accessToken = tokenData.GetProperty("access_token").GetString();
                var refreshToken = tokenData.GetProperty("refresh_token").GetString();
                var expiresIn = tokenData.GetProperty("expires_in").GetInt32();
                
                // Get user info using the access token
                client.DefaultRequestHeaders.Clear();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                
                var userResponse = await client.GetAsync("https://api.twitter.com/2/users/me");
                
                if (!userResponse.IsSuccessStatusCode)
                {
                    var errorContent = await userResponse.Content.ReadAsStringAsync();
                    Console.WriteLine($"Twitter user info error: {errorContent}");
                    return BadRequest($"Failed to get user info. Status: {userResponse.StatusCode}, Error: {errorContent}");
                }
                
                var userContent = await userResponse.Content.ReadAsStringAsync();
                var userData = JsonSerializer.Deserialize<JsonElement>(userContent);
                
                var twitterId = userData.GetProperty("data").GetProperty("id").GetString();
                var username = userData.GetProperty("data").GetProperty("username").GetString();
                
                // Check if account already exists
                var existingAccount = await _context.TwitterAccounts
                    .FirstOrDefaultAsync(a => a.TwitterId == twitterId && a.UserId == userId);
                    
                if (existingAccount != null)
                {
                    // Update existing account
                    existingAccount.AccessToken = accessToken;
                    existingAccount.RefreshToken = refreshToken;
                    existingAccount.TokenExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn);
                    existingAccount.Username = username;
                }
                else
                {
                    // Create new account
                    var newAccount = new TwitterAccount
                    {
                        TwitterId = twitterId,
                        Username = username,
                        AccessToken = accessToken,
                        RefreshToken = refreshToken,
                        TokenExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn),
                        UserId = userId
                    };
                    
                    _context.TwitterAccounts.Add(newAccount);
                }
                
                await _context.SaveChangesAsync();
                
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception in Twitter connect: {ex}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
        
        [HttpDelete("accounts/{id}")]
        public async Task<IActionResult> DeleteAccount(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            var account = await _context.TwitterAccounts
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
                
            if (account == null)
            {
                return NotFound();
            }
            
            _context.TwitterAccounts.Remove(account);
            await _context.SaveChangesAsync();
            
            return Ok(new { success = true });
        }
        
        // New function: Post a Tweet
        [HttpPost("accounts/{accountId}/tweets")]
        public async Task<IActionResult> PostTweet(int accountId, [FromBody] PostTweetDTO tweetDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            // Get the Twitter account
            var account = await _context.TwitterAccounts
                .FirstOrDefaultAsync(a => a.Id == accountId && a.UserId == userId);
                
            if (account == null)
            {
                return NotFound("Twitter account not found");
            }
            
            try
            {
                // Check if token is expired and refresh if needed
                if (DateTime.UtcNow >= account.TokenExpiresAt)
                {
                    if (!await RefreshAccessToken(account))
                    {
                        return BadRequest("Failed to refresh access token. Please reconnect your Twitter account.");
                    }
                }
                
                // Create a client for the Twitter API
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", account.AccessToken);
                
                // Prepare the tweet content
                var tweetContent = new
                {
                    text = tweetDto.Text
                };
                
                // Post the tweet to Twitter API v2
                var response = await client.PostAsJsonAsync("https://api.twitter.com/2/tweets", tweetContent);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"Twitter API error: {errorContent}");
                    return BadRequest($"Failed to post tweet. Status: {response.StatusCode}, Error: {errorContent}");
                }
                
                var content = await response.Content.ReadAsStringAsync();
                var tweetData = JsonSerializer.Deserialize<JsonElement>(content);
                
                return Ok(new
                {
                    success = true,
                    tweet = new
                    {
                        id = tweetData.GetProperty("data").GetProperty("id").GetString(),
                        text = tweetDto.Text
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception posting tweet: {ex}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
        
        // New function: Get user timeline (most recent tweets)
        [HttpGet("accounts/{accountId}/timeline")]
        public async Task<IActionResult> GetTimeline(int accountId, [FromQuery] int count = 10)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            // Get the Twitter account
            var account = await _context.TwitterAccounts
                .FirstOrDefaultAsync(a => a.Id == accountId && a.UserId == userId);
                
            if (account == null)
            {
                return NotFound("Twitter account not found");
            }
            
            try
            {
                // Check if token is expired and refresh if needed
                if (DateTime.UtcNow >= account.TokenExpiresAt)
                {
                    if (!await RefreshAccessToken(account))
                    {
                        return BadRequest("Failed to refresh access token. Please reconnect your Twitter account.");
                    }
                }
                
                // Create a client for the Twitter API
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", account.AccessToken);
                
                // Get the user's timeline (recent tweets)
                // We're using the user's tweets endpoint with expansions and tweet fields for more data
                var response = await client.GetAsync(
                    $"https://api.twitter.com/2/users/{account.TwitterId}/tweets?max_results={count}&tweet.fields=created_at,public_metrics&expansions=attachments.media_keys&media.fields=url,preview_image_url");
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"Twitter API error: {errorContent}");
                    return BadRequest($"Failed to get timeline. Status: {response.StatusCode}, Error: {errorContent}");
                }
                
                var content = await response.Content.ReadAsStringAsync();
                
                // Return the raw Twitter API response to the client
                // You might want to transform this into your own format in a real application
                return Ok(JsonSerializer.Deserialize<JsonElement>(content));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception getting timeline: {ex}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
        
        // Helper method to refresh an access token
        private async Task<bool> RefreshAccessToken(TwitterAccount account)
        {
            try
            {
                // Create a client for the token refresh
                var client = _httpClientFactory.CreateClient();
                
                // Set up Basic Authentication
                var clientId = _configuration["Twitter:ClientId"];
                var clientSecret = _configuration["Twitter:ClientSecret"];
                var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{clientId}:{clientSecret}"));
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);
                
                // Create form content for the refresh request
                var formContent = new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    { "grant_type", "refresh_token" },
                    { "refresh_token", account.RefreshToken }
                });
                
                // Make the request
                var response = await client.PostAsync("https://api.twitter.com/2/oauth2/token", formContent);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"Twitter token refresh error: {errorContent}");
                    return false;
                }
                
                var content = await response.Content.ReadAsStringAsync();
                var tokenData = JsonSerializer.Deserialize<JsonElement>(content);
                
                // Update the account with new tokens
                account.AccessToken = tokenData.GetProperty("access_token").GetString();
                account.RefreshToken = tokenData.GetProperty("refresh_token").GetString();
                account.TokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenData.GetProperty("expires_in").GetInt32());
                
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception refreshing token: {ex}");
                return false;
            }
        }
    }
    
    // Add this DTO class for the post tweet request
    public class PostTweetDTO
    {
        public string Text { get; set; }
    }
}