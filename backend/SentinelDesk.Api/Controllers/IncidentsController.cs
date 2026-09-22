using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SentinelDesk.Api.Contracts.Common;
using SentinelDesk.Api.Contracts.Incidents;
using SentinelDesk.Api.Contracts.RealTime;
using SentinelDesk.Api.Data;
using SentinelDesk.Api.Hubs;
using SentinelDesk.Api.Models;

namespace SentinelDesk.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class IncidentsController(
    SentinelDeskDbContext dbContext,
    IHubContext<SecurityHub> hubContext,
    ILogger<IncidentsController> logger) : ControllerBase
{
    // Enforces the one-way status workflow: Open → Investigating → Contained → Resolved → Closed.
    // Closed is terminal — it has no entry here, so TryGetValue returns false.
    private static readonly IReadOnlyDictionary<IncidentStatus, IncidentStatus> AllowedTransitions =
        new Dictionary<IncidentStatus, IncidentStatus>
        {
            [IncidentStatus.Open] = IncidentStatus.Investigating,
            [IncidentStatus.Investigating] = IncidentStatus.Contained,
            [IncidentStatus.Contained] = IncidentStatus.Resolved,
            [IncidentStatus.Resolved] = IncidentStatus.Closed,
        };

    // -------------------------------------------------------------------------
    // GET /api/incidents
    // -------------------------------------------------------------------------
    [HttpGet]
    [ProducesResponseType<PagedResponse<Incident>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResponse<Incident>>> GetAll(
        [FromQuery] IncidentQueryParameters query,
        CancellationToken cancellationToken)
    {
        var queryable = dbContext.Incidents.AsNoTracking();

        if (!query.IncludeArchived)
            queryable = queryable.Where(i => !i.IsArchived);

        if (query.Severity.HasValue)
            queryable = queryable.Where(i => i.Severity == query.Severity.Value);

        if (query.Status.HasValue)
            queryable = queryable.Where(i => i.Status == query.Status.Value);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            // ILike is PostgreSQL's case-insensitive LIKE — avoids a full-table ToLower scan.
            queryable = queryable.Where(i =>
                EF.Functions.ILike(i.Title, $"%{search}%") ||
                EF.Functions.ILike(i.Description, $"%{search}%"));
        }

        var totalItems = await queryable.CountAsync(cancellationToken);
        var totalPages = totalItems == 0 ? 0 : (int)Math.Ceiling(totalItems / (double)query.PageSize);

        var items = await queryable
            .OrderByDescending(i => i.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return Ok(new PagedResponse<Incident>
        {
            Items = items,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalItems = totalItems,
            TotalPages = totalPages
        });
    }

    // -------------------------------------------------------------------------
    // GET /api/incidents/{id}
    // -------------------------------------------------------------------------
    [HttpGet("{id:guid}")]
    [ProducesResponseType<Incident>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<Incident>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var incident = await dbContext.Incidents
            .AsNoTracking()
            .SingleOrDefaultAsync(i => i.Id == id, cancellationToken);

        return incident is null ? NotFound() : Ok(incident);
    }

    // -------------------------------------------------------------------------
    // POST /api/incidents
    // -------------------------------------------------------------------------
    [HttpPost]
    [ProducesResponseType<Incident>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<Incident>> Create(
        CreateIncidentRequest request,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var incident = new Incident
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Severity = request.Severity,
            Status = IncidentStatus.Open,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.Incidents.Add(incident);
        await dbContext.SaveChangesAsync(cancellationToken);

        await TryBroadcastAsync(
            SecurityHubEvents.IncidentCreated,
            new IncidentCreatedMessage(
                incident.Id,
                incident.Title,
                incident.Description,
                incident.Severity.ToString(),
                incident.Status.ToString(),
                incident.CreatedAt
            ),
            cancellationToken);

        return CreatedAtAction(nameof(GetById), new { incident.Id }, incident);
    }

    // -------------------------------------------------------------------------
    // PUT /api/incidents/{id}
    // -------------------------------------------------------------------------
    [HttpPut("{id:guid}")]
    [ProducesResponseType<Incident>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<Incident>> Update(
        Guid id,
        UpdateIncidentRequest request,
        CancellationToken cancellationToken)
    {
        var incident = await dbContext.Incidents
            .SingleOrDefaultAsync(i => i.Id == id, cancellationToken);

        if (incident is null)
            return NotFound();

        incident.Title = request.Title.Trim();
        incident.Description = request.Description.Trim();
        incident.Severity = request.Severity;
        incident.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        await TryBroadcastAsync(
            SecurityHubEvents.IncidentUpdated,
            new IncidentUpdatedMessage(
                incident.Id,
                incident.Title,
                incident.Description,
                incident.Severity.ToString(),
                incident.UpdatedAt
            ),
            cancellationToken);

        return Ok(incident);
    }

    // -------------------------------------------------------------------------
    // PATCH /api/incidents/{id}/status
    // -------------------------------------------------------------------------
    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType<Incident>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<Incident>> ChangeStatus(
        Guid id,
        ChangeIncidentStatusRequest request,
        CancellationToken cancellationToken)
    {
        var incident = await dbContext.Incidents
            .SingleOrDefaultAsync(i => i.Id == id, cancellationToken);

        if (incident is null)
            return NotFound();

        if (incident.IsArchived)
            return Conflict(new ProblemDetails
            {
                Title = "Incident is archived",
                Detail = "Status cannot be changed on an archived incident.",
                Status = StatusCodes.Status409Conflict,
                Instance = HttpContext.Request.Path
            });

        // Validate the transition against the allowed workflow.
        if (!AllowedTransitions.TryGetValue(incident.Status, out var allowedNext) ||
            allowedNext != request.NewStatus)
        {
            var detail = AllowedTransitions.TryGetValue(incident.Status, out var next)
                ? $"Cannot transition from '{incident.Status}' to '{request.NewStatus}'. " +
                  $"The only allowed next status is '{next}'."
                : $"'{incident.Status}' is a terminal status. No further transitions are allowed.";

            return Conflict(new ProblemDetails
            {
                Title = "Invalid status transition",
                Detail = detail,
                Status = StatusCodes.Status409Conflict,
                Instance = HttpContext.Request.Path
            });
        }

        var previousStatus = incident.Status;
        incident.Status = request.NewStatus;
        incident.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        await TryBroadcastAsync(
            SecurityHubEvents.IncidentStatusChanged,
            new IncidentStatusChangedMessage(
                incident.Id,
                previousStatus.ToString(),
                incident.Status.ToString(),
                incident.UpdatedAt
            ),
            cancellationToken);

        return Ok(incident);
    }

    // -------------------------------------------------------------------------
    // DELETE /api/incidents/{id}  — soft archive, never physical delete
    // -------------------------------------------------------------------------
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken)
    {
        var incident = await dbContext.Incidents
            .SingleOrDefaultAsync(i => i.Id == id, cancellationToken);

        if (incident is null)
            return NotFound();

        var now = DateTime.UtcNow;
        incident.IsArchived = true;
        incident.ArchivedAt = now;
        incident.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);

        await TryBroadcastAsync(
            SecurityHubEvents.IncidentArchived,
            new IncidentArchivedMessage(
                incident.Id,
                incident.ArchivedAt.Value
            ),
            cancellationToken);

        return NoContent();
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
