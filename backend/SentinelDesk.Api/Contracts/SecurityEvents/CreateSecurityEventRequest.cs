using System.ComponentModel.DataAnnotations;

namespace SentinelDesk.Api.Contracts.SecurityEvents;

/// <summary>Request body for POST /api/security-events.</summary>
public sealed class CreateSecurityEventRequest
{
    [Required(AllowEmptyStrings = false, ErrorMessage = "EventType is required.")]
    [StringLength(100, ErrorMessage = "EventType must not exceed 100 characters.")]
    public string EventType { get; init; } = string.Empty;

    [Required(AllowEmptyStrings = false, ErrorMessage = "SourceIp is required.")]
    [StringLength(45, ErrorMessage = "SourceIp must not exceed 45 characters (supports IPv6).")]
    public string SourceIp { get; init; } = string.Empty;

    [Required(AllowEmptyStrings = false, ErrorMessage = "Description is required.")]
    [StringLength(4_000, ErrorMessage = "Description must not exceed 4000 characters.")]
    public string Description { get; init; } = string.Empty;

    [Required(ErrorMessage = "RiskScore is required.")]
    [Range(0, 100, ErrorMessage = "RiskScore must be between 0 and 100.")]
    public int? RiskScore { get; init; }

    /// <summary>
    /// Optional. If supplied, the event will be linked to this incident.
    /// The incident must exist and must not be archived.
    /// </summary>
    public Guid? IncidentId { get; init; }
}
