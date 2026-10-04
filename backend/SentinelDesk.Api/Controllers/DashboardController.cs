using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SentinelDesk.Api.Data;
using SentinelDesk.Api.Models;
namespace SentinelDesk.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public sealed class DashboardController(SentinelDeskDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        // Aggregate the entire active dataset in SQL, independently of queue pagination.
        var active = db.Incidents.AsNoTracking().Where(item => !item.IsArchived);
        var byStatus = await active.GroupBy(item => item.Status)
            .Select(group => new { Label = group.Key.ToString(), Count = group.Count() }).ToListAsync(cancellationToken);
        var bySeverity = await active.GroupBy(item => item.Severity)
            .Select(group => new { Label = group.Key.ToString(), Count = group.Count() }).ToListAsync(cancellationToken);
        var criticalActive = await active.CountAsync(item => item.Severity == IncidentSeverity.Critical && item.Status != IncidentStatus.Resolved && item.Status != IncidentStatus.Closed, cancellationToken);
        var eventCount = await db.SecurityEvents.CountAsync(cancellationToken);
        var unlinkedEvents = await db.SecurityEvents.CountAsync(item => item.IncidentId == null, cancellationToken);
        var highRiskEvents = await db.SecurityEvents.CountAsync(item => item.RiskScore >= 75, cancellationToken);
        var archivedCount = await db.Incidents.CountAsync(item => item.IsArchived, cancellationToken);
        var recentIncidents = await active.OrderByDescending(item => item.CreatedAt).ThenBy(item => item.Id).Take(6).ToListAsync(cancellationToken);
        var recentEvents = await db.SecurityEvents.AsNoTracking().OrderByDescending(item => item.DetectedAt).ThenBy(item => item.Id).Take(7).ToListAsync(cancellationToken);
        return Ok(new { ByStatus = byStatus, BySeverity = bySeverity, CriticalActive = criticalActive,
            EventCount = eventCount, UnlinkedEvents = unlinkedEvents, HighRiskEvents = highRiskEvents,
            ArchivedCount = archivedCount, RecentIncidents = recentIncidents, RecentEvents = recentEvents,
            GeneratedAt = DateTime.UtcNow });
    }
}
