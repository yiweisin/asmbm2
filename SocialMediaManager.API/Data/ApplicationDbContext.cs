using Microsoft.EntityFrameworkCore;
using SocialMediaManager.API.Models;

namespace SocialMediaManager.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }
        
        public DbSet<User> Users { get; set; }
        public DbSet<TwitterAccount> TwitterAccounts { get; set; }
        public DbSet<DiscordAccount> DiscordAccounts { get; set; }
        public DbSet<TelegramAccount> TelegramAccounts { get; set; }
        
        // Add this line to fix the error:
        public DbSet<TwitterDailyMetric> TwitterDailyMetrics { get; set; }
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Existing relationships...
            
            // You might want to add the relationship for TwitterDailyMetric too:
            modelBuilder.Entity<TwitterAccount>()
                .HasMany(a => a.DailyMetrics)
                .WithOne(m => m.TwitterAccount)
                .HasForeignKey(m => m.TwitterAccountId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}