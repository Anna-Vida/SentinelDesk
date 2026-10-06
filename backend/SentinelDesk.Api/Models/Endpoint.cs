namespace SentinelDesk.Api.Models;

public sealed class Endpoint
{
    public Guid Id { get; set; }

    public required string ComputerName { get; set; }

    public string? OsName { get; set; }

    public string? OsVersion { get; set; }

    public string? AgentVersion { get; set; }

    public string? LastIpAddress { get; set; }

    public bool IsEnabled { get; set; } = true;

    public DateTime FirstSeenAt { get; set; }

    public DateTime LastSeenAt { get; set; }

    public DateTime? LastEventAt { get; set; }

    public ICollection<SecurityEvent> SecurityEvents { get; set; } = [];

    public ICollection<Incident> Incidents { get; set; } = [];
}
