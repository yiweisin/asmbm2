using System.ComponentModel.DataAnnotations;

namespace SocialMediaManager.API.DTOs
{
    public class TwitterConnectDTO
    {
        [Required]
        public string Code { get; set; }
        
        [Required]
        public string RedirectUri { get; set; }
    }
    
    public class DiscordConnectDTO
    {
        [Required]
        public string Code { get; set; }
        
        [Required]
        public string RedirectUri { get; set; }
    }
    
    public class TelegramConnectDTO
    {
        [Required]
        public string BotToken { get; set; }
    }
    
    public class TwitterAccountDTO
    {
        public int Id { get; set; }
        public string TwitterId { get; set; }
        public string Username { get; set; }
    }
    
    public class DiscordAccountDTO
    {
        public int Id { get; set; }
        public string DiscordId { get; set; }
        public string Username { get; set; }
    }
    
    public class TelegramAccountDTO
    {
        public int Id { get; set; }
        public string TelegramId { get; set; }
        public string Username { get; set; }
    }
}