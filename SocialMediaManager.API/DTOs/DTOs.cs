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
        
        public string AccountType { get; set; } = "basic"; // Default to basic if not specified
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
    
    public class UpdateAccountTypeDTO
    {
        [Required]
        public string AccountType { get; set; }
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
        public int TwitterAccountsCount { get; set; }
        public int DiscordAccountsCount { get; set; }
        public int TelegramAccountsCount { get; set; }
    }
    
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
}