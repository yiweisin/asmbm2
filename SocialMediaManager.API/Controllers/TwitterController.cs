using System;
using System.Linq;
using System.Net.Http;
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
        private readonly HttpClient _httpClient;
        
        public TwitterController(ApplicationDbContext context, IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _configuration = configuration;
            _httpClient = httpClientFactory.CreateClient();
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
                
                var tokenRequest = new
                {
                    client_id = _configuration["Twitter:ClientId"],
                    client_secret = _configuration["Twitter:ClientSecret"],
                    grant_type = "authorization_code",
                    code = connectDto.Code,
                    redirect_uri = connectDto.RedirectUri
                };
                
                var tokenResponse = await _httpClient.PostAsJsonAsync(tokenEndpoint, tokenRequest);
                
                if (!tokenResponse.IsSuccessStatusCode)
                {
                    return BadRequest("Failed to exchange code for access token");
                }
                
                var tokenData = await tokenResponse.Content.ReadFromJsonAsync<JsonElement>();
                var accessToken = tokenData.GetProperty("access_token").GetString();
                var refreshToken = tokenData.GetProperty("refresh_token").GetString();
                var expiresIn = tokenData.GetProperty("expires_in").GetInt32();
                
                // Get user info
                _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
                var userResponse = await _httpClient.GetAsync("https://api.twitter.com/2/users/me");
                
                if (!userResponse.IsSuccessStatusCode)
                {
                    return BadRequest("Failed to get user info");
                }
                
                var userData = await userResponse.Content.ReadFromJsonAsync<JsonElement>();
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
    }
}