using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SocialMediaManager.API.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        
        // Updated account type: individual, admin, or subaccount
        public string AccountType { get; set; } = "individual";
        
        // Parent ID for subaccounts (null for individual and admin accounts)
        public int? ParentId { get; set; }
        
        // Social media account collections
        public ICollection<TwitterAccount> TwitterAccounts { get; set; }
        public ICollection<DiscordAccount> DiscordAccounts { get; set; }
        public ICollection<TelegramAccount> TelegramAccounts { get; set; }
        
        // Navigation property - children (subaccounts) for admin accounts
        public ICollection<User> Subaccounts { get; set; }
        
        // Navigation property - parent for subaccounts
        public User Parent { get; set; }
    }
    
    public class TwitterAccount
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string TwitterId { get; set; }
        
        [Required]
        public string Username { get; set; }
        
        [Required]
        public string AccessToken { get; set; }
        
        public string RefreshToken { get; set; }
        
        public DateTime TokenExpiresAt { get; set; }
        
        // Foreign key
        public int UserId { get; set; }
        
        // Navigation property
        public User User { get; set; }
         public virtual ICollection<TwitterDailyMetric> DailyMetrics { get; set; } = new List<TwitterDailyMetric>();
    }
    
    public class DiscordAccount
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string DiscordId { get; set; }
        
        [Required]
        public string Username { get; set; }
        
        [Required]
        public string AccessToken { get; set; }
        
        public string RefreshToken { get; set; }
        
        public DateTime TokenExpiresAt { get; set; }
        
        // Foreign key
        public int UserId { get; set; }
        
        // Navigation property
        public User User { get; set; }
    }
    
    public class TelegramAccount
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string TelegramId { get; set; }
        
        [Required]
        public string Username { get; set; }
        
        [Required]
        public string BotToken { get; set; }
        
        // Foreign key
        public int UserId { get; set; }
        
        // Navigation property
        public User User { get; set; }
    }
     public class PostSubmission
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int SubmitterUserId { get; set; }
        
        [Required]
        public int AdminUserId { get; set; }
        
        [Required]
        public string Platform { get; set; } // "twitter", "discord", or "telegram"
        
        // Removed PlatformAccountId - will be selected by admin during approval
        
        public string TargetId { get; set; } // Channel ID for Discord, Chat ID for Telegram, null for Twitter
        
        [Required]
        public string Content { get; set; }
        
        public DateTime? ScheduledTime { get; set; } // Optional scheduling time
        
        [Required]
        public string Status { get; set; } = "pending"; // pending, approved, rejected
        
        public string RejectionReason { get; set; } = ""; // Reason for rejection, if applicable
        
        public DateTime SubmissionTime { get; set; } = DateTime.UtcNow;
        
        public DateTime? ReviewTime { get; set; } // When the admin reviewed the submission
        
        [JsonIgnore]
        public virtual User Submitter { get; set; }
        
        [JsonIgnore]
        public virtual User Admin { get; set; }
    }
}