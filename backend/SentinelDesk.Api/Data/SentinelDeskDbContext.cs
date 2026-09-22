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
            entity.Property(incident => incident.CreatedAt).HasColumnType("timestamp with time zone").IsRequired();
            entity.Property(incident => incident.UpdatedAt).HasColumnType("timestamp with time zone").IsRequired();
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
        });
    }
}
