using Microsoft.EntityFrameworkCore;
using SentinelDesk.Api.Models;

namespace SentinelDesk.Api.Data;

public sealed class SentinelDeskDbContext(DbContextOptions<SentinelDeskDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();

    public DbSet<DetectionRule> DetectionRules => Set<DetectionRule>();

    public DbSet<SentinelDesk.Api.Models.Endpoint> Endpoints => Set<SentinelDesk.Api.Models.Endpoint>();

    public DbSet<Incident> Incidents => Set<Incident>();

    public DbSet<IncidentActivity> IncidentActivities => Set<IncidentActivity>();

    public DbSet<SecurityEvent> SecurityEvents => Set<SecurityEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(user => user.Id);
            entity.Property(user => user.Email).HasMaxLength(320).IsRequired();
            entity.Property(user => user.DisplayName).HasMaxLength(100).IsRequired();
            entity.Property(user => user.PasswordHash).HasMaxLength(1_000).IsRequired();
            entity.Property(user => user.Role).HasConversion<string>().HasMaxLength(20).IsRequired();
            entity.Property(user => user.IsApproved).IsRequired().HasDefaultValue(true);
            entity.Property(user => user.CreatedAt).HasColumnType("timestamp with time zone").IsRequired();
            entity.HasIndex(user => user.Email).IsUnique();
        });

        modelBuilder.Entity<DetectionRule>(entity =>
        {
            entity.ToTable("DetectionRules");
            entity.HasKey(rule => rule.Id);
            entity.Property(rule => rule.RuleKey).HasMaxLength(100).IsRequired();
            entity.Property(rule => rule.Name).HasMaxLength(150).IsRequired();
            entity.Property(rule => rule.Description).HasMaxLength(1_000).IsRequired();
            entity.Property(rule => rule.IsEnabled).IsRequired().HasDefaultValue(true);
            entity.Property(rule => rule.Severity).HasConversion<string>().HasMaxLength(20).IsRequired();
            entity.Property(rule => rule.TriggerCount).IsRequired();
            entity.Property(rule => rule.WindowMinutes).IsRequired();
            entity.Property(rule => rule.RiskScore).IsRequired();
            entity.Property(rule => rule.MatchPatterns).HasMaxLength(4_000).IsRequired();
            entity.Property(rule => rule.UpdatedAt).HasColumnType("timestamp with time zone").IsRequired();
            entity.HasIndex(rule => rule.RuleKey).IsUnique();
        });

        modelBuilder.Entity<SentinelDesk.Api.Models.Endpoint>(entity =>
        {
            entity.ToTable("Endpoints");
            entity.HasKey(endpoint => endpoint.Id);
            entity.Property(endpoint => endpoint.ComputerName).HasMaxLength(255).IsRequired();
            entity.Property(endpoint => endpoint.OsName).HasMaxLength(255);
            entity.Property(endpoint => endpoint.OsVersion).HasMaxLength(100);
            entity.Property(endpoint => endpoint.AgentVersion).HasMaxLength(50);
            entity.Property(endpoint => endpoint.LastIpAddress).HasMaxLength(45);
            entity.Property(endpoint => endpoint.IsEnabled).IsRequired().HasDefaultValue(true);
            entity.Property(endpoint => endpoint.FirstSeenAt).HasColumnType("timestamp with time zone").IsRequired();
            entity.Property(endpoint => endpoint.LastSeenAt).HasColumnType("timestamp with time zone").IsRequired();
            entity.Property(endpoint => endpoint.LastEventAt).HasColumnType("timestamp with time zone");
            entity.HasIndex(endpoint => endpoint.ComputerName).IsUnique();
            entity.HasIndex(endpoint => endpoint.LastSeenAt);
        });

        modelBuilder.Entity<Incident>(entity =>
        {
            entity.ToTable("Incidents");
            entity.HasKey(incident => incident.Id);
            entity.Property(incident => incident.Title).HasMaxLength(200).IsRequired();
            entity.Property(incident => incident.Description).HasMaxLength(4_000).IsRequired();
            entity.Property(incident => incident.Severity).HasConversion<string>().HasMaxLength(20).IsRequired();
            entity.Property(incident => incident.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
            entity.Property(incident => incident.IsArchived).IsRequired().HasDefaultValue(false);
            entity.Property(incident => incident.ArchivedAt).HasColumnType("timestamp with time zone");
            entity.Property(incident => incident.CreatedAt).HasColumnType("timestamp with time zone").IsRequired();
            entity.Property(incident => incident.UpdatedAt).HasColumnType("timestamp with time zone").IsRequired();
            entity.Property(incident => incident.AssignedToDisplayName).HasMaxLength(100);

            // One incident has many security events; events survive if the incident is archived.
            entity.HasMany(incident => incident.SecurityEvents)
                  .WithOne(securityEvent => securityEvent.Incident)
                  .HasForeignKey(securityEvent => securityEvent.IncidentId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.SetNull);

            // Indexes to support the most common query filters.
            entity.HasIndex(incident => incident.Status);
            entity.HasIndex(incident => incident.Severity);
            entity.HasIndex(incident => incident.CreatedAt);
            entity.HasIndex(incident => incident.IsArchived);
            entity.HasIndex(incident => incident.EndpointId);
            entity.HasIndex(incident => incident.AssignedToUserId);

            entity.HasOne(incident => incident.Endpoint)
                  .WithMany(endpoint => endpoint.Incidents)
                  .HasForeignKey(incident => incident.EndpointId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<IncidentActivity>(entity =>
        {
            entity.ToTable("IncidentActivities");
            entity.HasKey(activity => activity.Id);
            entity.Property(activity => activity.ActivityType).HasMaxLength(50).IsRequired();
            entity.Property(activity => activity.Message).HasMaxLength(2_000).IsRequired();
            entity.Property(activity => activity.ActorDisplayName).HasMaxLength(100).IsRequired();
            entity.Property(activity => activity.CreatedAt).HasColumnType("timestamp with time zone").IsRequired();
            entity.HasIndex(activity => activity.IncidentId);
            entity.HasIndex(activity => activity.CreatedAt);

            entity.HasOne(activity => activity.Incident)
                  .WithMany(incident => incident.Activities)
                  .HasForeignKey(activity => activity.IncidentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SecurityEvent>(entity =>
        {
            entity.ToTable("SecurityEvents");
            entity.HasKey(securityEvent => securityEvent.Id);
            entity.Property(securityEvent => securityEvent.EventType).HasMaxLength(100).IsRequired();
            entity.Property(securityEvent => securityEvent.SourceIp).HasMaxLength(45).IsRequired();
            entity.Property(securityEvent => securityEvent.Description).HasMaxLength(4_000).IsRequired();
            entity.Property(securityEvent => securityEvent.RiskScore).IsRequired();
            entity.Property(securityEvent => securityEvent.DetectedAt).HasColumnType("timestamp with time zone").IsRequired();

            entity.HasIndex(securityEvent => securityEvent.DetectedAt);
            entity.HasIndex(securityEvent => securityEvent.IncidentId);
            entity.HasIndex(securityEvent => securityEvent.EndpointId);

            entity.HasOne(securityEvent => securityEvent.Endpoint)
                  .WithMany(endpoint => endpoint.SecurityEvents)
                  .HasForeignKey(securityEvent => securityEvent.EndpointId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
