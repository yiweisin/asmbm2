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
}