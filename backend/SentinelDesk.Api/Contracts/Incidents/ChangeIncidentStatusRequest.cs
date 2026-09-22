using System.ComponentModel.DataAnnotations;
using SentinelDesk.Api.Models;

namespace SentinelDesk.Api.Contracts.Incidents;

/// <summary>Request body for PATCH /api/incidents/{id}/status.</summary>
public sealed class ChangeIncidentStatusRequest
{
    [Required(ErrorMessage = "NewStatus is required.")]
    [EnumDataType(typeof(IncidentStatus), ErrorMessage = "NewStatus must be a valid IncidentStatus value.")]
    public IncidentStatus NewStatus { get; init; }
}
