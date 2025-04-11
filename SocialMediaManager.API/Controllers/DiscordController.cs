using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
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
    public class DiscordController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;
        
        public DiscordController(ApplicationDbContext context, IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _configuration = configuration;
            _httpClient = httpClientFactory.CreateClient();
        }
        
        [HttpGet("accounts")]
        public async Task<IActionResult> GetAccounts()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            var accounts = await _context.DiscordAccounts
                .Where(a => a.UserId == userId)
                .Select(a => new DiscordAccountDTO
                {
                    Id = a.Id,
                    DiscordId = a.DiscordId,
                    Username = a.Username
                })
                .ToListAsync();
                
            return Ok(accounts);
        }
        
        [HttpPost("connect")]
        public async Task<IActionResult> Connect(DiscordConnectDTO connectDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            try
            {
                // Exchange code for access token
                var tokenEndpoint = "https://discord.com/api/oauth2/token";
                
                var formData = new Dictionary<string, string>
                {
                    { "client_id", _configuration["Discord:ClientId"] },
                    { "client_secret", _configuration["Discord:ClientSecret"] },
                    { "grant_type", "authorization_code" },
                    { "code", connectDto.Code },
                    { "redirect_uri", connectDto.RedirectUri }
                };
                
                var content = new FormUrlEncodedContent(formData);
                var tokenResponse = await _httpClient.PostAsync(tokenEndpoint, content);
                
                if (!tokenResponse.IsSuccessStatusCode)
                {
                    return BadRequest("Failed to exchange code for access token");
                }
                
                var tokenJson = await tokenResponse.Content.ReadAsStringAsync();
                var tokenData = JsonSerializer.Deserialize<JsonElement>(tokenJson);
                
                var accessToken = tokenData.GetProperty("access_token").GetString();
                var refreshToken = tokenData.GetProperty("refresh_token").GetString();
                var expiresIn = tokenData.GetProperty("expires_in").GetInt32();
                
                // Get user info
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                var userResponse = await _httpClient.GetAsync("https://discord.com/api/users/@me");
                
                if (!userResponse.IsSuccessStatusCode)
                {
                    return BadRequest("Failed to get user info");
                }
                
                var userJson = await userResponse.Content.ReadAsStringAsync();
                var userData = JsonSerializer.Deserialize<JsonElement>(userJson);
                
                var discordId = userData.GetProperty("id").GetString();
                var username = userData.GetProperty("username").GetString();
                
                // Check if account already exists
                var existingAccount = await _context.DiscordAccounts
                    .FirstOrDefaultAsync(a => a.DiscordId == discordId && a.UserId == userId);
                    
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
                    var newAccount = new DiscordAccount
                    {
                        DiscordId = discordId,
                        Username = username,
                        AccessToken = accessToken,
                        RefreshToken = refreshToken,
                        TokenExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn),
                        UserId = userId
                    };
                    
                    _context.DiscordAccounts.Add(newAccount);
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
            
            var account = await _context.DiscordAccounts
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
                
            if (account == null)
            {
                return NotFound();
            }
            
            _context.DiscordAccounts.Remove(account);
            await _context.SaveChangesAsync();
            
            return Ok(new { success = true });
        }
    }
}