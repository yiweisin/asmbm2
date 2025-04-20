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
        public DbSet<TwitterDailyMetric> TwitterDailyMetrics { get; set; }
        public DbSet<ScheduledPost> ScheduledPosts { get; set; }
        public DbSet<PostSubmission> PostSubmissions { get; set; }
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Configure User self-referencing relationship for subaccounts
            modelBuilder.Entity<User>()
                .HasMany(u => u.Subaccounts)
                .WithOne(u => u.Parent)
                .HasForeignKey(u => u.ParentId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Existing relationships
            modelBuilder.Entity<TwitterAccount>()
                .HasMany(a => a.DailyMetrics)
                .WithOne(m => m.TwitterAccount)
                .HasForeignKey(m => m.TwitterAccountId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // ScheduledPost relationships
            modelBuilder.Entity<ScheduledPost>()
                .HasOne(p => p.User)
                .WithMany()
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Configure ErrorMessage to have a default empty string
            modelBuilder.Entity<ScheduledPost>()
                .Property(p => p.ErrorMessage)
                .HasDefaultValue("");
                
            // Additional configuration for ScheduledPost
            modelBuilder.Entity<ScheduledPost>()
                .Property(p => p.Status)
                .HasDefaultValue("scheduled");
                
            modelBuilder.Entity<ScheduledPost>()
                .Property(p => p.Platform)
                .IsRequired();
                
            // Make TargetId nullable in the database
            modelBuilder.Entity<ScheduledPost>()
                .Property(p => p.TargetId)
                .IsRequired(false);
                
            // Configure PostSubmission relationships
            modelBuilder.Entity<PostSubmission>()
                .HasOne(p => p.Submitter)
                .WithMany()
                .HasForeignKey(p => p.SubmitterUserId)
                .OnDelete(DeleteBehavior.Restrict);
                
            modelBuilder.Entity<PostSubmission>()
                .HasOne(p => p.Admin)
                .WithMany()
                .HasForeignKey(p => p.AdminUserId)
                .OnDelete(DeleteBehavior.Restrict);
                
            // Configure RejectionReason to have a default empty string
            modelBuilder.Entity<PostSubmission>()
                .Property(p => p.RejectionReason)
                .HasDefaultValue("");
                
            // Configure Status default value
            modelBuilder.Entity<PostSubmission>()
                .Property(p => p.Status)
                .HasDefaultValue("pending");
        }
    }
}