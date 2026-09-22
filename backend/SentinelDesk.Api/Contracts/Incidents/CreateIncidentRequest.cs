using System.ComponentModel.DataAnnotations;
using SentinelDesk.Api.Models;

namespace SentinelDesk.Api.Contracts.Incidents;

public sealed class CreateIncidentRequest
{
    [Required]
    [StringLength(200)]
    public string Title { get; init; } = string.Empty;

    [Required]
    [StringLength(4_000)]
    public string Description { get; init; } = string.Empty;

    [EnumDataType(typeof(IncidentSeverity))]
    public IncidentSeverity Severity { get; init; }
}
