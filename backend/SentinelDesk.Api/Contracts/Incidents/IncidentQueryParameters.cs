using System.ComponentModel.DataAnnotations;
using SentinelDesk.Api.Models;

namespace SentinelDesk.Api.Contracts.Incidents;

/// <summary>Query parameters for GET /api/incidents.</summary>
public sealed class IncidentQueryParameters
{
    /// <summary>Page number (1-based). Default: 1.</summary>
    [Range(1, int.MaxValue, ErrorMessage = "Page must be at least 1.")]
    public int Page { get; init; } = 1;

    /// <summary>Items per page. Default: 20. Maximum: 100.</summary>
    [Range(1, 100, ErrorMessage = "PageSize must be between 1 and 100.")]
    public int PageSize { get; init; } = 20;

    /// <summary>Filter by severity. Omit to return all severities.</summary>
    public IncidentSeverity? Severity { get; init; }

    /// <summary>Filter by status. Omit to return all statuses.</summary>
    public IncidentStatus? Status { get; init; }

    /// <summary>Case-insensitive text search on Title and Description.</summary>
    public string? Search { get; init; }

    /// <summary>When true, archived incidents are included. Default: false.</summary>
    public bool IncludeArchived { get; init; } = false;
}
