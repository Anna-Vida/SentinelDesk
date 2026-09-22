using Microsoft.EntityFrameworkCore;
using SentinelDesk.Api.Models;

namespace SentinelDesk.Api.Data;

public sealed class SentinelDeskDbContext(DbContextOptions<SentinelDeskDbContext> options) : DbContext(options)
{
    public DbSet<Incident> Incidents => Set<Incident>();

    public DbSet<SecurityEvent> SecurityEvents => Set<SecurityEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

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
        });
    }
}
