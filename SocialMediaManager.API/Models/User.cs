using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SocialMediaManager.API.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [StringLength(50)]
        public string Username { get; set; }
        
        [Required]
        [EmailAddress]
        [StringLength(100)]
        public string Email { get; set; }
        
        [Required]
        public string PasswordHash { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
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