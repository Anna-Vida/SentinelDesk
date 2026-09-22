using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SentinelDesk.Api.Contracts.RealTime;
using SentinelDesk.Api.Contracts.SecurityEvents;
using SentinelDesk.Api.Data;
using SentinelDesk.Api.Hubs;
using SentinelDesk.Api.Models;

namespace SentinelDesk.Api.Controllers;

[ApiController]
[Route("api/security-events")]
public sealed class SecurityEventsController(
    SentinelDeskDbContext dbContext,
    IHubContext<SecurityHub> hubContext,
    ILogger<SecurityEventsController> logger) : ControllerBase
{
    // -------------------------------------------------------------------------
    // GET /api/security-events
    // -------------------------------------------------------------------------
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<SecurityEvent>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SecurityEvent>>> GetAll(CancellationToken cancellationToken)
    {
        var events = await dbContext.SecurityEvents
            .AsNoTracking()
            .OrderByDescending(se => se.DetectedAt)
            .ToListAsync(cancellationToken);

        return Ok(events);
    }

    // -------------------------------------------------------------------------
    // GET /api/security-events/{id}
    // -------------------------------------------------------------------------
    [HttpGet("{id:guid}")]
    [ProducesResponseType<SecurityEvent>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SecurityEvent>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var securityEvent = await dbContext.SecurityEvents
            .AsNoTracking()
            .SingleOrDefaultAsync(se => se.Id == id, cancellationToken);

        return securityEvent is null ? NotFound() : Ok(securityEvent);
    }

    // -------------------------------------------------------------------------
    // POST /api/security-events
    // -------------------------------------------------------------------------
    [HttpPost]
    [ProducesResponseType<SecurityEvent>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SecurityEvent>> Create(
        CreateSecurityEventRequest request,
        CancellationToken cancellationToken)
    {
        // If an IncidentId was supplied, validate it exists and is not archived.
        if (request.IncidentId.HasValue)
        {
            var incident = await dbContext.Incidents
                .AsNoTracking()
                .SingleOrDefaultAsync(i => i.Id == request.IncidentId.Value, cancellationToken);

            if (incident is null)
                return NotFound(new ProblemDetails
                {
                    Title = "Incident not found",
                    Detail = $"No incident with ID '{request.IncidentId}' exists.",
                    Status = StatusCodes.Status404NotFound,
                    Instance = HttpContext.Request.Path
                });

            if (incident.IsArchived)
                return Conflict(new ProblemDetails
                {
                    Title = "Incident is archived",
                    Detail = $"Security events cannot be linked to archived incident '{request.IncidentId}'.",
                    Status = StatusCodes.Status409Conflict,
                    Instance = HttpContext.Request.Path
                });
        }

        var securityEvent = new SecurityEvent
        {
            Id = Guid.NewGuid(),
            EventType = request.EventType.Trim(),
            SourceIp = request.SourceIp.Trim(),
            Description = request.Description.Trim(),
            RiskScore = request.RiskScore!.Value,
            DetectedAt = DateTime.UtcNow,
            IncidentId = request.IncidentId
        };

        dbContext.SecurityEvents.Add(securityEvent);
        await dbContext.SaveChangesAsync(cancellationToken);

        await TryBroadcastAsync(
            SecurityHubEvents.SecurityEventCreated,
            new SecurityEventCreatedMessage(
                securityEvent.Id,
                securityEvent.EventType,
                securityEvent.SourceIp,
                securityEvent.Description,
                securityEvent.RiskScore,
                securityEvent.DetectedAt,
                securityEvent.IncidentId
            ),
            cancellationToken);

        return CreatedAtAction(nameof(GetById), new { securityEvent.Id }, securityEvent);
    }

    // -------------------------------------------------------------------------
    // PATCH /api/security-events/{eventId}/incident/{incidentId}
    // Links an existing security event to an existing, non-archived incident.
    // -------------------------------------------------------------------------
    [HttpPatch("{eventId:guid}/incident/{incidentId:guid}")]
    [ProducesResponseType<SecurityEvent>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SecurityEvent>> LinkToIncident(
        Guid eventId,
        Guid incidentId,
        CancellationToken cancellationToken)
    {
        var securityEvent = await dbContext.SecurityEvents
            .SingleOrDefaultAsync(se => se.Id == eventId, cancellationToken);

        if (securityEvent is null)
            return NotFound(new ProblemDetails
            {
                Title = "Security event not found",
                Detail = $"No security event with ID '{eventId}' exists.",
                Status = StatusCodes.Status404NotFound,
                Instance = HttpContext.Request.Path
            });

        var incident = await dbContext.Incidents
            .AsNoTracking()
            .SingleOrDefaultAsync(i => i.Id == incidentId, cancellationToken);

        if (incident is null)
            return NotFound(new ProblemDetails
            {
                Title = "Incident not found",
                Detail = $"No incident with ID '{incidentId}' exists.",
                Status = StatusCodes.Status404NotFound,
                Instance = HttpContext.Request.Path
            });

        if (incident.IsArchived)
            return Conflict(new ProblemDetails
            {
                Title = "Incident is archived",
                Detail = $"Security events cannot be linked to archived incident '{incidentId}'.",
                Status = StatusCodes.Status409Conflict,
                Instance = HttpContext.Request.Path
            });

        securityEvent.IncidentId = incidentId;
        await dbContext.SaveChangesAsync(cancellationToken);

        await TryBroadcastAsync(
            SecurityHubEvents.SecurityEventLinked,
            new SecurityEventLinkedMessage(
                securityEvent.Id,
                incidentId,
                DateTime.UtcNow
            ),
            cancellationToken);

        return Ok(securityEvent);
    }

    private async Task TryBroadcastAsync(string eventName, object message, CancellationToken cancellationToken)
    {
        try
        {
            await hubContext.Clients.All.SendAsync(eventName, message, cancellationToken);
            logger.LogInformation("Broadcast real-time event '{EventName}' to connected clients", eventName);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to broadcast real-time event '{EventName}'. Database state remains authoritative", eventName);
        }
    }
}
