using System.ComponentModel.DataAnnotations;
using SentinelDesk.Api.Models;

namespace SentinelDesk.Api.Contracts.Incidents;

/// <summary>Request body for PUT /api/incidents/{id}.</summary>
public sealed class UpdateIncidentRequest
{
    [Required(AllowEmptyStrings = false, ErrorMessage = "Title is required.")]
    [StringLength(200, ErrorMessage = "Title must not exceed 200 characters.")]
    public string Title { get; init; } = string.Empty;

    [Required(AllowEmptyStrings = false, ErrorMessage = "Description is required.")]
    [StringLength(4_000, ErrorMessage = "Description must not exceed 4000 characters.")]
    public string Description { get; init; } = string.Empty;

    [EnumDataType(typeof(IncidentSeverity), ErrorMessage = "Severity must be a valid IncidentSeverity value.")]
    public IncidentSeverity Severity { get; init; }
}
