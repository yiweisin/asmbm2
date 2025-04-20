using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SocialMediaManager.API.Data;
using SocialMediaManager.API.DTOs;
using SocialMediaManager.API.Models;

namespace SocialMediaManager.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ScheduleController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ScheduleController> _logger;
        
        // Define UTC+8 time zone offset
        private static readonly TimeSpan _utc8Offset = TimeSpan.FromHours(8);
        
        public ScheduleController(ApplicationDbContext context, ILogger<ScheduleController> logger)
        {
            _context = context;
            _logger = logger;
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
        
        [HttpGet]
        public async Task<IActionResult> GetScheduledPosts([FromQuery] string status = null)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            var query = _context.ScheduledPosts.Where(p => p.UserId == userId);
            
            // Apply status filter if provided
            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(p => p.Status == status.ToLower());
            }
            
            var posts = await query
                .OrderByDescending(p => p.ScheduledTime)
                .Select(p => new ScheduledPostDTO
                {
                    Id = p.Id,
                    Platform = p.Platform,
                    PlatformAccountId = p.PlatformAccountId,
                    TargetId = p.TargetId,
                    Content = p.Content,
                    ScheduledTime = p.ScheduledTime, // Will be converted to UTC+8 before returning
                    PostedTime = p.PostedTime,
                    Status = p.Status,
                    ErrorMessage = p.ErrorMessage
                })
                .ToListAsync();
                
            // Convert UTC times to UTC+8 for display
            foreach (var post in posts)
            {
                post.ScheduledTime = ToUtc8(post.ScheduledTime);
                
                if (post.PostedTime.HasValue)
                {
                    post.PostedTime = ToUtc8(post.PostedTime.Value);
                }
            }
                
            return Ok(posts);
        }
        
        [HttpPost]
        public async Task<IActionResult> CreateScheduledPost(CreateScheduledPostDTO dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            // Validate platform
            if (!new[] { "twitter", "discord", "telegram" }.Contains(dto.Platform.ToLower()))
            {
                return BadRequest("Invalid platform. Must be 'twitter', 'discord', or 'telegram'.");
            }
            
            // Verify ownership of the account
            bool accountExists = false;
            
            switch (dto.Platform.ToLower())
            {
                case "twitter":
                    accountExists = await _context.TwitterAccounts
                        .AnyAsync(a => a.Id == dto.PlatformAccountId && a.UserId == userId);
                    break;
                case "discord":
                    accountExists = await _context.DiscordAccounts
                        .AnyAsync(a => a.Id == dto.PlatformAccountId && a.UserId == userId);
                    break;
                case "telegram":
                    accountExists = await _context.TelegramAccounts
                        .AnyAsync(a => a.Id == dto.PlatformAccountId && a.UserId == userId);
                    break;
            }
            
            if (!accountExists)
            {
                return BadRequest("Account not found or you don't have permission to use it.");
            }
            
            // Convert received UTC+8 time to UTC for storage
            var utcScheduledTime = FromUtc8(dto.ScheduledTime);
            
            _logger.LogInformation($"Creating scheduled post - Received time (UTC+8): {dto.ScheduledTime:yyyy-MM-dd HH:mm:ss}, Storing as UTC: {utcScheduledTime:yyyy-MM-dd HH:mm:ss}");
            
            // Create scheduled post
            var post = new ScheduledPost
            {
                UserId = userId,
                Platform = dto.Platform.ToLower(),
                PlatformAccountId = dto.PlatformAccountId,
                TargetId = dto.TargetId ?? "", // Use empty string if null
                Content = dto.Content,
                ScheduledTime = utcScheduledTime, // Store in UTC
                Status = "scheduled",
                ErrorMessage = "" // Initialize with empty string
            };
            
            _context.ScheduledPosts.Add(post);
            await _context.SaveChangesAsync();
            
            // Return the post with times converted back to UTC+8
            return Ok(new ScheduledPostDTO
            {
                Id = post.Id,
                Platform = post.Platform,
                PlatformAccountId = post.PlatformAccountId,
                TargetId = post.TargetId,
                Content = post.Content,
                ScheduledTime = ToUtc8(post.ScheduledTime), // Convert to UTC+8 for display
                Status = post.Status,
                ErrorMessage = post.ErrorMessage
            });
        }
        
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteScheduledPost(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            var post = await _context.ScheduledPosts
                .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
                
            if (post == null)
            {
                return NotFound("Scheduled post not found.");
            }
            
            // Only allow deletion of scheduled posts
            if (post.Status != "scheduled")
            {
                return BadRequest("Cannot delete posts that have already been processed.");
            }
            
            _context.ScheduledPosts.Remove(post);
            await _context.SaveChangesAsync();
            
            return Ok(new { success = true, message = "Scheduled post deleted successfully." });
        }
        
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateScheduledPost(int id, UpdateScheduledPostDTO dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            var post = await _context.ScheduledPosts
                .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
                
            if (post == null)
            {
                return NotFound("Scheduled post not found.");
            }
            
            // Only allow updates to scheduled posts
            if (post.Status != "scheduled")
            {
                return BadRequest("Cannot update posts that have already been processed.");
            }
            
            // Update post fields
            if (!string.IsNullOrEmpty(dto.Content))
            {
                post.Content = dto.Content;
            }
            
            if (dto.ScheduledTime != default)
            {
                // Convert received UTC+8 time to UTC for storage
                var utcScheduledTime = FromUtc8(dto.ScheduledTime);
                
                _logger.LogInformation($"Updating scheduled post {id} - Received time (UTC+8): {dto.ScheduledTime:yyyy-MM-dd HH:mm:ss}, Storing as UTC: {utcScheduledTime:yyyy-MM-dd HH:mm:ss}");
                
                post.ScheduledTime = utcScheduledTime;
            }
            
            await _context.SaveChangesAsync();
            
            // Return the updated post with times converted to UTC+8
            return Ok(new ScheduledPostDTO
            {
                Id = post.Id,
                Platform = post.Platform,
                PlatformAccountId = post.PlatformAccountId,
                TargetId = post.TargetId,
                Content = post.Content,
                ScheduledTime = ToUtc8(post.ScheduledTime), // Convert to UTC+8 for display
                Status = post.Status,
                ErrorMessage = post.ErrorMessage
            });
        }
    }
}