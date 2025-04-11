using System;
using System.Linq;
using System.Net.Http;
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
    public class TelegramController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;
        
        public TelegramController(ApplicationDbContext context, IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _configuration = configuration;
            _httpClient = httpClientFactory.CreateClient();
        }
        
        [HttpGet("accounts")]
        public async Task<IActionResult> GetAccounts()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            var accounts = await _context.TelegramAccounts
                .Where(a => a.UserId == userId)
                .Select(a => new TelegramAccountDTO
                {
                    Id = a.Id,
                    TelegramId = a.TelegramId,
                    Username = a.Username
                })
                .ToListAsync();
                
            return Ok(accounts);
        }
        
        [HttpPost("connect")]
        public async Task<IActionResult> Connect(TelegramConnectDTO connectDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            try
            {
                // Verify bot token by calling the Telegram API
                var response = await _httpClient.GetAsync($"https://api.telegram.org/bot{connectDto.BotToken}/getMe");
                
                if (!response.IsSuccessStatusCode)
                {
                    return BadRequest("Invalid bot token");
                }
                
                var jsonResponse = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<JsonElement>(jsonResponse);
                
                if (!data.GetProperty("ok").GetBoolean())
                {
                    return BadRequest("Failed to connect to Telegram");
                }
                
                var botData = data.GetProperty("result");
                var telegramId = botData.GetProperty("id").GetInt64().ToString();
                var username = botData.GetProperty("username").GetString();
                
                // Check if account already exists
                var existingAccount = await _context.TelegramAccounts
                    .FirstOrDefaultAsync(a => a.TelegramId == telegramId && a.UserId == userId);
                    
                if (existingAccount != null)
                {
                    // Update existing account
                    existingAccount.BotToken = connectDto.BotToken;
                    existingAccount.Username = username;
                }
                else
                {
                    // Create new account
                    var newAccount = new TelegramAccount
                    {
                        TelegramId = telegramId,
                        Username = username,
                        BotToken = connectDto.BotToken,
                        UserId = userId
                    };
                    
                    _context.TelegramAccounts.Add(newAccount);
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
            
            var account = await _context.TelegramAccounts
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
                
            if (account == null)
            {
                return NotFound();
            }
            
            _context.TelegramAccounts.Remove(account);
            await _context.SaveChangesAsync();
            
            return Ok(new { success = true });
        }
        
        [HttpPost("accounts/{id}/send")]
        public async Task<IActionResult> SendMessage(int id, [FromBody] SendMessageDTO messageDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            var account = await _context.TelegramAccounts
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
                
            if (account == null)
            {
                return NotFound();
            }
            
            try
            {
                var response = await _httpClient.GetAsync(
                    $"https://api.telegram.org/bot{account.BotToken}/sendMessage?chat_id={messageDto.ChatId}&text={Uri.EscapeDataString(messageDto.Message)}"
                );
                
                if (!response.IsSuccessStatusCode)
                {
                    return BadRequest("Failed to send message");
                }
                
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
    
    public class SendMessageDTO
    {
        public string ChatId { get; set; }
        public string Message { get; set; }
    }
}