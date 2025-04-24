using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SocialMediaManager.API.DTOs
{
    // Authentication DTOs
    public class RegisterDTO
    {
        [Required]
        [StringLength(50, MinimumLength = 3)]
        public string Username { get; set; }
        
        [Required]
        [EmailAddress]
        public string Email { get; set; }
        
        [Required]
        [StringLength(100, MinimumLength = 6)]
        public string Password { get; set; }
        
        public string AccountType { get; set; } = "individual"; // Default to individual if not specified
    }
    
    public class LoginDTO
    {
        [Required]
        public string Username { get; set; }
        
        [Required]
        public string Password { get; set; }
    }
    
    public class UpdateProfileDTO
    {
        [StringLength(50, MinimumLength = 3)]
        public string Username { get; set; }
        
        [EmailAddress]
        public string Email { get; set; }
    }

    public class ChangePasswordDTO
    {
        [Required]
        public string CurrentPassword { get; set; }
        
        [Required]
        [StringLength(100, MinimumLength = 6)]
        public string NewPassword { get; set; }
    }
    
    // New DTO for creating subaccounts
    public class CreateSubaccountDTO
    {
        [Required]
        [StringLength(50, MinimumLength = 3)]
        public string Username { get; set; }
        
        [Required]
        [EmailAddress]
        public string Email { get; set; }
        
        [Required]
        [StringLength(100, MinimumLength = 6)]
        public string Password { get; set; }
    }
    
    // Response DTOs
    public class AuthResponseDTO
    {
        public string Token { get; set; }
        public UserDTO User { get; set; }
    }
    
    public class UserDTO
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string AccountType { get; set; }
        public int? ParentId { get; set; }
        public int TwitterAccountsCount { get; set; }
        public int DiscordAccountsCount { get; set; }
        public int TelegramAccountsCount { get; set; }
    }
    
    // Other DTOs remain the same
    // Twitter DTOs
    public class TwitterConnectDTO
    {
        [Required]
        public string Code { get; set; }
        
        [Required]
        public string RedirectUri { get; set; }
        
        [Required]
        public string CodeVerifier { get; set; }
    }
    public class TwitterAccountDTO
    {
        public int Id { get; set; }
        public string TwitterId { get; set; }
        public string Username { get; set; }
        public string ProfileImageUrl { get; set; }
    }
    
    public class TwitterTweetDTO
    {
        public string Id { get; set; }
        public string Text { get; set; }
        public string CreatedAt { get; set; }
        public int Likes { get; set; }
        public int Retweets { get; set; }
        public int Replies { get; set; }
    }
    
    public class TwitterAnalyticsDTO
    {
        public int Followers { get; set; }
        public int Following { get; set; }
        public int TweetsCount { get; set; }
        public List<ChartDataPoint> FollowersGrowth { get; set; }
        public List<ChartDataPoint> EngagementRate { get; set; }
    }
    
    // Discord DTOs
    public class DiscordConnectDTO
    {
        [Required]
        public string Code { get; set; }
        
        [Required]
        public string RedirectUri { get; set; }
    }
    
    public class DiscordAccountDTO
    {
        public int Id { get; set; }
        public string DiscordId { get; set; }
        public string Username { get; set; }
        public string Discriminator { get; set; }
        public string AvatarUrl { get; set; }
    }
    
    public class DiscordServerDTO
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string IconUrl { get; set; }
        public int MemberCount { get; set; }
    }
    
    public class DiscordChannelDTO
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Type { get; set; }
    }
    
    public class DiscordMessageDTO
    {
        public string Id { get; set; }
        public string Content { get; set; }
        public string CreatedAt { get; set; }
        public DiscordUserDTO Author { get; set; }
    }
    
    public class DiscordUserDTO
    {
        public string Id { get; set; }
        public string Username { get; set; }
        public string Discriminator { get; set; }
        public string AvatarUrl { get; set; }
    }
    
    // Telegram DTOs
    public class TelegramConnectDTO
    {
        [Required]
        public string BotToken { get; set; }
    }
    
    public class TelegramAccountDTO
    {
        public int Id { get; set; }
        public string TelegramId { get; set; }
        public string Username { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
    }
    
    public class TelegramChatDTO
    {
        public long Id { get; set; }
        public string Title { get; set; }
        public string Type { get; set; }
        public int MemberCount { get; set; }
    }
    
    public class TelegramMessageDTO
    {
        public int MessageId { get; set; }
        public string Text { get; set; }
        public string Date { get; set; }
    }
    
    // Shared DTOs
    public class ChartDataPoint
    {
        public string Date { get; set; }
        public double Value { get; set; }
    }
    public class ScheduledPostDTO
    {
        public int Id { get; set; }
        public string Platform { get; set; }
        public int PlatformAccountId { get; set; }
        public string TargetId { get; set; }
        public string Content { get; set; }
        public DateTime ScheduledTime { get; set; }
        public DateTime? PostedTime { get; set; }
        public string Status { get; set; }
        public string ErrorMessage { get; set; }
    }
    
    public class CreateScheduledPostDTO
    {
        [Required]
        public string Platform { get; set; }
        
        [Required]
        public int PlatformAccountId { get; set; }
        
        public string TargetId { get; set; } // Required for Discord and Telegram
        
        [Required]
        [StringLength(280)] // Max tweet length
        public string Content { get; set; }
        
        [Required]
        public DateTime ScheduledTime { get; set; }
    }
    
    public class UpdateScheduledPostDTO
    {
        [StringLength(280)] // Max tweet length
        public string Content { get; set; }
        
        public DateTime ScheduledTime { get; set; }
    }
    public class CreateSubmissionDTO
{
    [Required]
    public string Platform { get; set; }
    
    public string TargetId { get; set; } // Now optional for all platforms
    
    [Required]
    [StringLength(2000)] // Max content length
    public string Content { get; set; }
    
    public DateTime? ScheduledTime { get; set; } // Optional scheduling time
}
    
    // DTO for returning submission data - simplified
    public class SubmissionDTO
    {
        public int Id { get; set; }
        public int SubmitterUserId { get; set; }
        public int AdminUserId { get; set; }
        public string SubmitterUsername { get; set; }
        public string AdminUsername { get; set; }
        public string Platform { get; set; }
        public string TargetId { get; set; }
        public string TargetName { get; set; } // For Discord channels or Telegram chats
        public string Content { get; set; }
        public DateTime? ScheduledTime { get; set; }
        public string Status { get; set; }
        public string RejectionReason { get; set; }
        public DateTime SubmissionTime { get; set; }
        public DateTime? ReviewTime { get; set; }
    }
    
    // DTO for admin reviewing a submission - now includes account selection
    public class ReviewSubmissionDTO
    {
        [Required]
        public string Action { get; set; } // "approve" or "reject"
        
        public string RejectionReason { get; set; } // Required if action is "reject"
        
        public DateTime? ScheduledTime { get; set; } // Can override the original scheduled time
    }
    
    
}