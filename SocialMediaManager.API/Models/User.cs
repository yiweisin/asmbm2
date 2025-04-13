using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SocialMediaManager.API.Models
{
      public class User
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public string AccountType { get; set; } = "basic"; // Default value is "basic"
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLoginAt { get; set; }
        
        // Navigation properties
        public ICollection<TwitterAccount> TwitterAccounts { get; set; }
        public ICollection<DiscordAccount> DiscordAccounts { get; set; }
        public ICollection<TelegramAccount> TelegramAccounts { get; set; }
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
}