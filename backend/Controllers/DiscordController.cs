using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
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
        private readonly ILogger<DiscordController> _logger;
        private readonly string _botToken;
        
        public DiscordController(
            ApplicationDbContext context, 
            IConfiguration configuration, 
            IHttpClientFactory httpClientFactory,
            ILogger<DiscordController> logger)
        {
            _context = context;
            _configuration = configuration;
            _httpClient = httpClientFactory.CreateClient();
            _logger = logger;
            _botToken = _configuration["Discord:BotToken"];
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
                
                var tokenJson = await tokenResponse.Content.ReadAsStringAsync();
                
                if (!tokenResponse.IsSuccessStatusCode)
                {
                    _logger.LogError($"Failed to exchange code for access token: {tokenJson}");
                    return BadRequest($"Failed to exchange code for access token: {tokenJson}");
                }
                
                var tokenData = JsonSerializer.Deserialize<JsonElement>(tokenJson);
                
                var accessToken = tokenData.GetProperty("access_token").GetString();
                var refreshToken = tokenData.GetProperty("refresh_token").GetString();
                var expiresIn = tokenData.GetProperty("expires_in").GetInt32();
                
                // Get user info
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                var userResponse = await _httpClient.GetAsync("https://discord.com/api/users/@me");
                
                var userJson = await userResponse.Content.ReadAsStringAsync();
                
                if (!userResponse.IsSuccessStatusCode)
                {
                    _logger.LogError($"Failed to get user info: {userJson}");
                    return BadRequest($"Failed to get user info: {userJson}");
                }
                
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
                _logger.LogError($"Error connecting Discord account: {ex}");
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

        // This method now uses ONLY the bot token to list servers the bot is in
        [HttpGet("servers")]
        public async Task<IActionResult> GetBotServers()
        {
            try
            {
                if (string.IsNullOrEmpty(_botToken))
                {
                    return BadRequest("Bot token is not configured");
                }
                
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bot", _botToken);
                
                // Get bot's user info to know its ID
                var botUserResponse = await _httpClient.GetAsync("https://discord.com/api/users/@me");
                if (!botUserResponse.IsSuccessStatusCode)
                {
                    var errorContent = await botUserResponse.Content.ReadAsStringAsync();
                    _logger.LogError($"Failed to get bot user info: {errorContent}");
                    return BadRequest("Invalid bot token");
                }
                
                // Get the servers the bot is in
                var serversResponse = await _httpClient.GetAsync("https://discord.com/api/users/@me/guilds");
                var serversJson = await serversResponse.Content.ReadAsStringAsync();
                
                if (!serversResponse.IsSuccessStatusCode)
                {
                    _logger.LogError($"Failed to fetch bot servers: {serversJson}");
                    return BadRequest("Failed to fetch servers the bot is in");
                }
                
                var servers = JsonSerializer.Deserialize<JsonElement>(serversJson);
                
                var serversList = new List<DiscordServerDTO>();
                
                foreach (var server in servers.EnumerateArray())
                {
                    serversList.Add(new DiscordServerDTO
                    {
                        Id = server.GetProperty("id").GetString(),
                        Name = server.GetProperty("name").GetString(),
                        IconUrl = server.TryGetProperty("icon", out var icon) && icon.ValueKind != JsonValueKind.Null 
                            ? $"https://cdn.discordapp.com/icons/{server.GetProperty("id").GetString()}/{icon.GetString()}.png" 
                            : null,
                        MemberCount = 0 // Not available in this endpoint
                    });
                }
                
                return Ok(serversList);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error getting bot servers: {ex}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("servers/{serverId}/channels")]
        public async Task<IActionResult> GetServerChannels(string serverId)
        {
            try
            {
                if (string.IsNullOrEmpty(_botToken))
                {
                    return BadRequest("Bot token is not configured");
                }
                
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bot", _botToken);
                
                var response = await _httpClient.GetAsync($"https://discord.com/api/guilds/{serverId}/channels");
                var channelsJson = await response.Content.ReadAsStringAsync();
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Failed to fetch channels: {channelsJson}");
                    return BadRequest($"Failed to fetch channels: {channelsJson}");
                }
                
                var channels = JsonSerializer.Deserialize<JsonElement>(channelsJson);
                
                var channelsList = new List<DiscordChannelDTO>();
                
                foreach (var channel in channels.EnumerateArray())
                {
                    // Only include text channels (type 0)
                    if (channel.TryGetProperty("type", out var typeElement) && typeElement.GetInt32() == 0)
                    {
                        channelsList.Add(new DiscordChannelDTO
                        {
                            Id = channel.GetProperty("id").GetString(),
                            Name = channel.GetProperty("name").GetString(),
                            Type = "0"
                        });
                    }
                }
                
                return Ok(channelsList);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error getting channels: {ex}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("channels/{channelId}/messages")]
        public async Task<IActionResult> SendMessage(string channelId, [FromBody] SendMessageDTO messageDto)
        {
            try
            {
                if (string.IsNullOrEmpty(_botToken))
                {
                    return BadRequest("Bot token is not configured");
                }
                
                if (messageDto == null || string.IsNullOrWhiteSpace(messageDto.Content))
                {
                    return BadRequest("Message content cannot be empty");
                }
                
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bot", _botToken);
                
                var content = new StringContent(
                    JsonSerializer.Serialize(new { content = messageDto.Content }),
                    Encoding.UTF8,
                    "application/json");
                    
                var response = await _httpClient.PostAsync($"https://discord.com/api/channels/{channelId}/messages", content);
                var responseJson = await response.Content.ReadAsStringAsync();
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Failed to send message: {responseJson}");
                    return BadRequest($"Failed to send message: {responseJson}");
                }
                
                var message = JsonSerializer.Deserialize<JsonElement>(responseJson);
                
                return Ok(new { success = true, messageId = message.GetProperty("id").GetString() });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error sending message: {ex}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // Get messages from a channel
        [HttpGet("channels/{channelId}/messages")]
        public async Task<IActionResult> GetChannelMessages(string channelId, [FromQuery] int limit = 50)
        {
            try
            {
                if (string.IsNullOrEmpty(_botToken))
                {
                    return BadRequest("Bot token is not configured");
                }
                
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bot", _botToken);
                
                var response = await _httpClient.GetAsync($"https://discord.com/api/channels/{channelId}/messages?limit={limit}");
                var messagesJson = await response.Content.ReadAsStringAsync();
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Failed to fetch messages: {messagesJson}");
                    return BadRequest($"Failed to fetch messages: {messagesJson}");
                }
                
                var messages = JsonSerializer.Deserialize<JsonElement>(messagesJson);
                
                var messagesList = new List<DiscordMessageDTO>();
                
                foreach (var message in messages.EnumerateArray())
                {
                    var author = message.GetProperty("author");
                    
                    messagesList.Add(new DiscordMessageDTO
                    {
                        Id = message.GetProperty("id").GetString(),
                        Content = message.GetProperty("content").GetString(),
                        CreatedAt = message.TryGetProperty("timestamp", out var timestamp) ? timestamp.GetString() : DateTime.UtcNow.ToString("o"),
                        Author = new DiscordUserDTO
                        {
                            Id = author.GetProperty("id").GetString(),
                            Username = author.GetProperty("username").GetString(),
                            Discriminator = author.TryGetProperty("discriminator", out var discriminator) 
                                ? discriminator.GetString() 
                                : null,
                            AvatarUrl = author.TryGetProperty("avatar", out var avatar) && avatar.ValueKind != JsonValueKind.Null
                                ? $"https://cdn.discordapp.com/avatars/{author.GetProperty("id").GetString()}/{avatar.GetString()}.png"
                                : null
                        }
                    });
                }
                
                return Ok(messagesList);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error getting messages: {ex}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
        [HttpGet("accounts/admin/{adminId}")]
        public async Task<IActionResult> GetAdminAccounts(int adminId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var currentUser = await _context.Users.FindAsync(userId);
            
            if (currentUser == null)
            {
                return NotFound("User not found");
            }
            
            // Only subaccounts can access their admin's accounts
            if (currentUser.AccountType != "subaccount")
            {
                return BadRequest("Only subaccounts can access admin accounts");
            }
            
            // Ensure the requested admin is actually this subaccount's parent
            if (currentUser.ParentId != adminId)
            {
                return BadRequest("You can only access accounts of your parent admin");
            }
            
            var accounts = await _context.DiscordAccounts
                .Where(a => a.UserId == adminId)
                .Select(a => new DiscordAccountDTO
                {
                    Id = a.Id,
                    DiscordId = a.DiscordId,
                    Username = a.Username
                })
                .ToListAsync();
                
            return Ok(accounts);
        }
    
        public class SendMessageDTO
        {
            public string Content { get; set; }
        }
    }
}