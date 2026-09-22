namespace SentinelDesk.Api.Models;

public sealed class Incident
{
    public Guid Id { get; set; }

    public required string Title { get; set; }

    public required string Description { get; set; }

    public IncidentSeverity Severity { get; set; }

    public IncidentStatus Status { get; set; }

    /// <summary>Soft-archive flag. Use DELETE /api/incidents/{id} to set this.</summary>
    public bool IsArchived { get; set; }

    /// <summary>Set automatically when the incident is archived.</summary>
    public DateTime? ArchivedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    /// <summary>Security events linked to this incident.</summary>
    public ICollection<SecurityEvent> SecurityEvents { get; set; } = [];
}
