using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SocialMediaManager.API.Models
{
    public class ScheduledPost
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int UserId { get; set; }
        
        [Required]
        public string Platform { get; set; } // "twitter", "discord", or "telegram"
        
        [Required]
        public int PlatformAccountId { get; set; }
        
        public string TargetId { get; set; } // Channel ID for Discord, Chat ID for Telegram, null for Twitter
        
        [Required]
        public string Content { get; set; }
        
        [Required]
        public DateTime ScheduledTime { get; set; }
        
        public DateTime? PostedTime { get; set; }
        
        [Required]
        public string Status { get; set; } = "scheduled"; // scheduled, completed, failed
        
        public string ErrorMessage { get; set; } = ""; // Initialize with empty string instead of null
        
        [JsonIgnore]
        public virtual User User { get; set; }
    }
}