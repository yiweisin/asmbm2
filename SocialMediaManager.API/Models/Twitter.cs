using System;
using System.ComponentModel.DataAnnotations;

namespace SocialMediaManager.API.Models
{
    // Daily metrics for a Twitter account
    public class TwitterDailyMetric
    {
        [Key]
        public int Id { get; set; }
        
        // Foreign key to the Twitter account
        public int TwitterAccountId { get; set; }
        
        // Navigation property
        public virtual TwitterAccount TwitterAccount { get; set; }
        
        // The date this metric was recorded
        public DateTime RecordedDate { get; set; }
        
        // Number of followers
        public int FollowerCount { get; set; }
        
        // Total number of likes received
        public int TotalLikes { get; set; }
        
        // Total number of views/impressions
        public int TotalViews { get; set; }
        
        // Total number of tweets
        public int TweetCount { get; set; }
        
        // Total number of retweets
        public int RetweetCount { get; set; }
        
        // Total number of replies
        public int ReplyCount { get; set; }
    }

    // Add these properties to your existing TwitterAccount model
    // public virtual ICollection<TwitterDailyMetric> DailyMetrics { get; set; }
}