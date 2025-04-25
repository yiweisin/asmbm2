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
    public class SubmissionController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SubmissionController> _logger;
        
        // Define UTC+8 time zone offset
        private static readonly TimeSpan _utc8Offset = TimeSpan.FromHours(8);
        
        public SubmissionController(ApplicationDbContext context, ILogger<SubmissionController> logger)
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
        
        // Get submissions - Different behavior for subaccounts vs admins
        [HttpGet]
        public async Task<IActionResult> GetSubmissions([FromQuery] string status = null)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var currentUser = await _context.Users.FindAsync(userId);
            
            if (currentUser == null)
            {
                return NotFound("User not found");
            }
            
            // Different queries based on user type
            IQueryable<PostSubmission> query;
            
            if (currentUser.AccountType == "subaccount")
            {
                // Subaccounts see only their own submissions
                query = _context.PostSubmissions.Where(s => s.SubmitterUserId == userId);
            }
            else if (currentUser.AccountType == "admin")
            {
                // Admins see submissions from their subaccounts
                var subaccountIds = await _context.Users
                    .Where(u => u.ParentId == userId)
                    .Select(u => u.Id)
                    .ToListAsync();
                
                query = _context.PostSubmissions.Where(s => subaccountIds.Contains(s.SubmitterUserId));
            }
            else
            {
                // Individual accounts don't use the submission system
                return BadRequest("Individual accounts don't have access to the submission system");
            }
            
            // Apply status filter if provided
            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(s => s.Status == status.ToLower());
            }
            
            // Include related data for richer responses
            query = query
                .Include(s => s.Submitter)
                .Include(s => s.Admin)
                .OrderByDescending(s => s.SubmissionTime);
            
            var submissions = await query.ToListAsync();
            
            // Transform to DTOs
            var result = new List<SubmissionDTO>();
            
            foreach (var submission in submissions)
            {
                var dto = new SubmissionDTO
                {
                    Id = submission.Id,
                    SubmitterUserId = submission.SubmitterUserId,
                    AdminUserId = submission.AdminUserId,
                    SubmitterUsername = submission.Submitter?.Username ?? "Unknown",
                    AdminUsername = submission.Admin?.Username ?? "Pending",
                    Platform = submission.Platform,
                    TargetId = submission.TargetId,
                    TargetName = await GetTargetName(submission.Platform, submission.TargetId),
                    Content = submission.Content,
                    Status = submission.Status,
                    RejectionReason = submission.RejectionReason,
                    // Convert all date times to UTC+8
                    SubmissionTime = ToUtc8(submission.SubmissionTime),
                    ReviewTime = submission.ReviewTime.HasValue ? ToUtc8(submission.ReviewTime.Value) : (DateTime?)null
                };
                
                // Convert scheduled time if it exists
                if (submission.ScheduledTime.HasValue)
                {
                    dto.ScheduledTime = ToUtc8(submission.ScheduledTime.Value);
                }
                
                result.Add(dto);
            }
            
            return Ok(result);
        }
        
        // Create a new submission (for subaccounts) - simplified, without requiring targetId
        [HttpPost]
        public async Task<IActionResult> CreateSubmission([FromBody] CreateSubmissionDTO dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var currentUser = await _context.Users.FindAsync(userId);
            
            if (currentUser == null)
            {
                return NotFound("User not found");
            }
            
            // Only subaccounts can create submissions
            if (currentUser.AccountType != "subaccount")
            {
                return BadRequest("Only subaccounts can create submissions");
            }
            
            // Verify parent admin exists
            if (!currentUser.ParentId.HasValue)
            {
                return BadRequest("Subaccount doesn't have a parent admin");
            }
            
            var admin = await _context.Users.FindAsync(currentUser.ParentId.Value);
            if (admin == null || admin.AccountType != "admin")
            {
                return BadRequest("Parent admin not found");
            }
            
            // Validate platform
            if (!new[] { "twitter", "discord", "telegram" }.Contains(dto.Platform.ToLower()))
            {
                return BadRequest("Invalid platform. Must be 'twitter', 'discord', or 'telegram'.");
            }
            
            // Create submission - targetId is now optional for all platforms
            var submission = new PostSubmission
            {
                SubmitterUserId = userId,
                AdminUserId = admin.Id,
                Platform = dto.Platform.ToLower(),
                TargetId = dto.TargetId ?? "", // Use empty string if null
                Content = dto.Content,
                Status = "pending",
                SubmissionTime = DateTime.UtcNow
            };
            
            // Handle scheduling time (convert from UTC+8 to UTC)
            if (dto.ScheduledTime.HasValue)
            {
                submission.ScheduledTime = FromUtc8(dto.ScheduledTime.Value);
            }
            
            _context.PostSubmissions.Add(submission);
            await _context.SaveChangesAsync();
            
            return Ok(new { id = submission.Id, message = "Submission created successfully" });
        }
        
        // Get submission details
        [HttpGet("{id}")]
        public async Task<IActionResult> GetSubmission(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var currentUser = await _context.Users.FindAsync(userId);
            
            if (currentUser == null)
            {
                return NotFound("User not found");
            }
            
            var submission = await _context.PostSubmissions
                .Include(s => s.Submitter)
                .Include(s => s.Admin)
                .FirstOrDefaultAsync(s => s.Id == id);
                
            if (submission == null)
            {
                return NotFound("Submission not found");
            }
            
            // Check permission - Either the submitter or the admin can view
            bool isSubmitter = submission.SubmitterUserId == userId;
            bool isAdmin = submission.AdminUserId == userId;
            
            if (!isSubmitter && !isAdmin)
            {
                return Forbid("You don't have permission to view this submission");
            }
            
            // Create DTO for response
            var dto = new SubmissionDTO
            {
                Id = submission.Id,
                SubmitterUserId = submission.SubmitterUserId,
                AdminUserId = submission.AdminUserId,
                SubmitterUsername = submission.Submitter?.Username ?? "Unknown",
                AdminUsername = submission.Admin?.Username ?? "Pending",
                Platform = submission.Platform,
                TargetId = submission.TargetId,
                TargetName = await GetTargetName(submission.Platform, submission.TargetId),
                Content = submission.Content,
                Status = submission.Status,
                RejectionReason = submission.RejectionReason,
                // Convert all date times to UTC+8
                SubmissionTime = ToUtc8(submission.SubmissionTime),
                ReviewTime = submission.ReviewTime.HasValue ? ToUtc8(submission.ReviewTime.Value) : (DateTime?)null
            };
            
            // Convert scheduled time if it exists
            if (submission.ScheduledTime.HasValue)
            {
                dto.ScheduledTime = ToUtc8(submission.ScheduledTime.Value);
            }
            
            return Ok(dto);
        }
        
        // Review submission (for admins only) - now includes account selection
        [HttpPost("{id}/review")]
        public async Task<IActionResult> ReviewSubmission(int id, [FromBody] ReviewSubmissionDTO dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var currentUser = await _context.Users.FindAsync(userId);
            
            if (currentUser == null)
            {
                return NotFound("User not found");
            }
            
            // Only admins can review submissions
            if (currentUser.AccountType != "admin")
            {
                return BadRequest("Only admins can review submissions");
            }
            
            var submission = await _context.PostSubmissions.FindAsync(id);
            if (submission == null)
            {
                return NotFound("Submission not found");
            }
            
            // Check if this admin is the assigned reviewer
            if (submission.AdminUserId != userId)
            {
                return Forbid("You are not authorized to review this submission");
            }
            
            // Check if submission is already reviewed
            if (submission.Status != "pending")
            {
                return BadRequest("This submission has already been reviewed");
            }
            
            // Process the review
            if (dto.Action.ToLower() == "reject")
            {
                
                submission.Status = "rejected";
                submission.RejectionReason = dto.RejectionReason;
                submission.ReviewTime = DateTime.UtcNow;
            }
            else
            {
                submission.Status = "approved";
                submission.RejectionReason = "NA";
                submission.ReviewTime = DateTime.UtcNow;
            }
            
            await _context.SaveChangesAsync();
            
            return Ok(new { status = submission.Status });
        }
        // Helper methods
        private async Task<string> GetTargetName(string platform, string targetId)
        {
            if (string.IsNullOrEmpty(targetId))
            {
                return "";
            }
            
            switch (platform.ToLower())
            {
                case "discord":
                    // This would require a call to Discord API to get channel name
                    return $"Channel: {targetId}";
                
                case "telegram":
                    // This would require a call to Telegram API to get chat name
                    return $"Chat: {targetId}";
                
                default:
                    return "";
            }
        }
    }
}