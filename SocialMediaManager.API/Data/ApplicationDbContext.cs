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
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // User to TwitterAccount relationship
            modelBuilder.Entity<User>()
                .HasMany(u => u.TwitterAccounts)
                .WithOne(t => t.User)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            
            // User to DiscordAccount relationship
            modelBuilder.Entity<User>()
                .HasMany(u => u.DiscordAccounts)
                .WithOne(d => d.User)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            
            // User to TelegramAccount relationship
            modelBuilder.Entity<User>()
                .HasMany(u => u.TelegramAccounts)
                .WithOne(t => t.User)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}