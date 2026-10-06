using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SentinelDesk.Api.Contracts.RealTime;
using SentinelDesk.Api.Data;
using SentinelDesk.Api.Hubs;
using SentinelDesk.Api.Models;
using SentinelDesk.Api.Security;

namespace SentinelDesk.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/endpoints")]
public sealed class EndpointsController(
    SentinelDeskDbContext dbContext,
    IHubContext<SecurityHub> hubContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<EndpointSummaryResponse>>> GetEndpoints(
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var onlineCutoff = now.AddMinutes(-3);
        var eventCutoff = now.AddHours(-24);

        var endpoints = await dbContext.Endpoints
            .AsNoTracking()
            .OrderByDescending(endpoint => endpoint.LastSeenAt)
            .Select(endpoint => new EndpointSummaryResponse(
                endpoint.Id,
                endpoint.ComputerName,
                endpoint.OsName,
                endpoint.OsVersion,
                endpoint.AgentVersion,
                endpoint.LastIpAddress,
                endpoint.IsEnabled,
                endpoint.IsEnabled && endpoint.LastSeenAt >= onlineCutoff,
                endpoint.FirstSeenAt,
                endpoint.LastSeenAt,
                endpoint.LastEventAt,
                endpoint.SecurityEvents.Count(item => item.DetectedAt >= eventCutoff),
                endpoint.SecurityEvents.Count(item => item.DetectedAt >= eventCutoff && item.RiskScore >= 70),
                endpoint.Incidents.Count(item => !item.IsArchived && item.Status != IncidentStatus.Closed)))
            .ToListAsync(cancellationToken);

        return Ok(endpoints);
    }

    [Authorize(Roles = RoleNames.Admin)]
    [HttpPatch("{id:guid}/enabled")]
    public async Task<ActionResult<EndpointSummaryResponse>> SetEnabled(
        Guid id,
        SetEndpointEnabledRequest request,
        CancellationToken cancellationToken)
    {
        var endpoint = await dbContext.Endpoints
            .Include(item => item.SecurityEvents)
            .Include(item => item.Incidents)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (endpoint is null)
            return NotFound();

        endpoint.IsEnabled = request.Enabled;
        await dbContext.SaveChangesAsync(cancellationToken);

        await hubContext.Clients.All.SendAsync(
            SecurityHubEvents.EndpointUpdated,
            new EndpointUpdatedMessage(
                endpoint.Id,
                endpoint.ComputerName,
                endpoint.IsEnabled,
                endpoint.LastSeenAt,
                endpoint.LastEventAt,
                endpoint.AgentVersion),
            cancellationToken);

        var now = DateTime.UtcNow;
        var eventCutoff = now.AddHours(-24);

        return Ok(new EndpointSummaryResponse(
            endpoint.Id,
            endpoint.ComputerName,
            endpoint.OsName,
            endpoint.OsVersion,
            endpoint.AgentVersion,
            endpoint.LastIpAddress,
            endpoint.IsEnabled,
            endpoint.IsEnabled && endpoint.LastSeenAt >= now.AddMinutes(-3),
            endpoint.FirstSeenAt,
            endpoint.LastSeenAt,
            endpoint.LastEventAt,
            endpoint.SecurityEvents.Count(item => item.DetectedAt >= eventCutoff),
            endpoint.SecurityEvents.Count(item => item.DetectedAt >= eventCutoff && item.RiskScore >= 70),
            endpoint.Incidents.Count(item => !item.IsArchived && item.Status != IncidentStatus.Closed)));
    }
}

public sealed record SetEndpointEnabledRequest(bool Enabled);

public sealed record EndpointSummaryResponse(
    Guid Id,
    string ComputerName,
    string? OsName,
    string? OsVersion,
    string? AgentVersion,
    string? LastIpAddress,
    bool IsEnabled,
    bool IsOnline,
    DateTime FirstSeenAt,
    DateTime LastSeenAt,
    DateTime? LastEventAt,
    int EventsLast24Hours,
    int HighRiskEventsLast24Hours,
    int OpenIncidents);
