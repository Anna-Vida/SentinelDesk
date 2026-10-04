using System.ComponentModel.DataAnnotations;
namespace SentinelDesk.Api.Contracts.SecurityEvents;
public sealed class SecurityEventQueryParameters
{
    [Range(1, 1000000)] public int Page { get; init; } = 1;
    [Range(1, 100)] public int PageSize { get; init; } = 20;
    [StringLength(200)] public string? Search { get; init; }
    [Range(0, 100)] public int? MinRisk { get; init; }
    public bool UnlinkedOnly { get; init; }
    public Guid? IncidentId { get; init; }
}
