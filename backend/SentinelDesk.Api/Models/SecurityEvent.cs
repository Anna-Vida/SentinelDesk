namespace SentinelDesk.Api.Models;

public sealed class SecurityEvent
{
    public Guid Id { get; set; }

    public required string EventType { get; set; }

    public required string SourceIp { get; set; }

    public required string Description { get; set; }

    public int RiskScore { get; set; }

    public DateTime DetectedAt { get; set; }
}
