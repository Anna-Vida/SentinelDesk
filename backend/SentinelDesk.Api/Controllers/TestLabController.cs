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

[Authorize(Roles = RoleNames.AnalystOrAdmin)]
[ApiController]
[Route("api/test-lab")]
public sealed class TestLabController(
    SentinelDeskDbContext dbContext,
    IHubContext<SecurityHub> hubContext) : ControllerBase
{
    private const string TestTitlePrefix = "[LIVE TEST]";

    [HttpGet("status")]
    public async Task<ActionResult<TestLabStatusResponse>> GetStatus(CancellationToken cancellationToken)
    {
        var databaseOnline = await dbContext.Database.CanConnectAsync(cancellationToken);
        var incidentCount = databaseOnline
            ? await dbContext.Incidents.CountAsync(i => !i.IsArchived, cancellationToken)
            : 0;
        var eventCount = databaseOnline
            ? await dbContext.SecurityEvents.CountAsync(cancellationToken)
            : 0;

        return Ok(new TestLabStatusResponse(databaseOnline, incidentCount, eventCount, DateTime.UtcNow));
    }

    [HttpPost("scenarios/{scenario}")]
    public async Task<ActionResult<TestScenarioResponse>> RunScenario(
        string scenario,
        CancellationToken cancellationToken)
    {
        var definition = GetScenario(scenario);
        if (definition is null)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Unknown test scenario",
                Detail = "Use phishing, brute-force, or malware.",
                Status = StatusCodes.Status400BadRequest,
                Instance = HttpContext.Request.Path
            });
        }

        var now = DateTime.UtcNow;
        var incident = new Incident
        {
            Id = Guid.NewGuid(),
            Title = $"{TestTitlePrefix} {definition.Title}",
            Description = definition.Description,
            Severity = definition.Severity,
            Status = IncidentStatus.Open,
            IsArchived = false,
            CreatedAt = now,
            UpdatedAt = now
        };

        var events = definition.Events.Select((template, index) => new SecurityEvent
        {
            Id = Guid.NewGuid(),
            EventType = template.EventType,
            SourceIp = template.SourceIp,
            Description = template.Description,
            RiskScore = template.RiskScore,
            DetectedAt = now.AddSeconds(index),
            IncidentId = incident.Id
        }).ToList();

        dbContext.Incidents.Add(incident);
        dbContext.SecurityEvents.AddRange(events);
        await dbContext.SaveChangesAsync(cancellationToken);

        await hubContext.Clients.All.SendAsync(
            SecurityHubEvents.IncidentCreated,
            new IncidentCreatedMessage(
                incident.Id,
                incident.Title,
                incident.Description,
                incident.Severity.ToString(),
                incident.Status.ToString(),
                incident.CreatedAt),
            cancellationToken);

        foreach (var securityEvent in events)
        {
            await hubContext.Clients.All.SendAsync(
                SecurityHubEvents.SecurityEventCreated,
                new SecurityEventCreatedMessage(
                    securityEvent.Id,
                    securityEvent.EventType,
                    securityEvent.SourceIp,
                    securityEvent.Description,
                    securityEvent.RiskScore,
                    securityEvent.DetectedAt,
                    securityEvent.IncidentId),
                cancellationToken);
        }

        return Ok(new TestScenarioResponse(
            scenario,
            ToIncidentResponse(incident),
            events.Select(ToEventResponse).ToList(),
            "Scenario created in the live database and broadcast to connected SentinelDesk clients."));
    }

    [Authorize(Roles = RoleNames.Admin)]
    [HttpDelete("data")]
    public async Task<ActionResult<TestDataClearResponse>> ClearTestData(CancellationToken cancellationToken)
    {
        var testIncidentIds = await dbContext.Incidents
            .Where(incident => incident.Title.StartsWith(TestTitlePrefix))
            .Select(incident => incident.Id)
            .ToListAsync(cancellationToken);

        if (testIncidentIds.Count == 0)
            return Ok(new TestDataClearResponse(0, 0));

        var deletedEvents = await dbContext.SecurityEvents
            .Where(securityEvent =>
                securityEvent.IncidentId.HasValue &&
                testIncidentIds.Contains(securityEvent.IncidentId.Value))
            .ExecuteDeleteAsync(cancellationToken);

        var deletedIncidents = await dbContext.Incidents
            .Where(incident => testIncidentIds.Contains(incident.Id))
            .ExecuteDeleteAsync(cancellationToken);

        foreach (var incidentId in testIncidentIds)
        {
            await hubContext.Clients.All.SendAsync(
                SecurityHubEvents.IncidentArchived,
                new IncidentArchivedMessage(incidentId, DateTime.UtcNow),
                cancellationToken);
        }

        return Ok(new TestDataClearResponse(deletedIncidents, deletedEvents));
    }

    private static TestIncidentResponse ToIncidentResponse(Incident incident) =>
        new(
            incident.Id,
            incident.Title,
            incident.Description,
            incident.Severity.ToString(),
            incident.Status.ToString(),
            incident.IsArchived,
            incident.ArchivedAt,
            incident.CreatedAt,
            incident.UpdatedAt);

    private static TestSecurityEventResponse ToEventResponse(SecurityEvent securityEvent) =>
        new(
            securityEvent.Id,
            securityEvent.EventType,
            securityEvent.SourceIp,
            securityEvent.Description,
            securityEvent.RiskScore,
            securityEvent.DetectedAt,
            securityEvent.IncidentId);

    private static ScenarioDefinition? GetScenario(string scenario) =>
        scenario.Trim().ToLowerInvariant() switch
        {
            "phishing" => new(
                "Credential phishing campaign",
                "Multiple users reported a lookalike Microsoft 365 login page. Test data for validating triage, telemetry correlation, and real-time updates.",
                IncidentSeverity.High,
                [
                    new("Suspicious Email", "203.0.113.45", "User received a credential-harvesting email with a spoofed sign-in link.", 74),
                    new("DNS Anomaly", "203.0.113.45", "Endpoint resolved a newly observed lookalike authentication domain.", 81),
                    new("Failed MFA", "198.51.100.20", "Multiple MFA challenges followed the suspected credential submission.", 88)
                ]),
            "brute-force" => new(
                "Brute-force authentication attack",
                "High-volume authentication failures followed by a successful login. Test data for validating account-compromise workflows.",
                IncidentSeverity.Critical,
                [
                    new("Authentication Failure", "198.51.100.77", "Thirty-seven failed sign-in attempts detected within five minutes.", 78),
                    new("Impossible Travel", "198.51.100.77", "Login geography changed beyond physically possible travel time.", 91),
                    new("Privileged Login", "198.51.100.77", "A successful privileged sign-in occurred after repeated failures.", 96)
                ]),
            "malware" => new(
                "Endpoint malware outbreak",
                "Suspicious executable activity and command-and-control traffic were detected on a workstation. Test data for containment workflow validation.",
                IncidentSeverity.Critical,
                [
                    new("Malware Detection", "10.20.5.24", "Endpoint protection detected an unsigned executable in the user profile.", 92),
                    new("PowerShell Execution", "10.20.5.24", "Encoded PowerShell command launched from the suspicious process tree.", 89),
                    new("C2 Beacon", "10.20.5.24", "Repeated outbound connections matched command-and-control beacon behavior.", 97)
                ]),
            _ => null
        };

    private sealed record ScenarioDefinition(
        string Title,
        string Description,
        IncidentSeverity Severity,
        IReadOnlyList<EventTemplate> Events);

    private sealed record EventTemplate(
        string EventType,
        string SourceIp,
        string Description,
        int RiskScore);
}

public sealed record TestLabStatusResponse(
    bool DatabaseOnline,
    int ActiveIncidents,
    int SecurityEvents,
    DateTime CheckedAt);

public sealed record TestIncidentResponse(
    Guid Id,
    string Title,
    string Description,
    string Severity,
    string Status,
    bool IsArchived,
    DateTime? ArchivedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record TestSecurityEventResponse(
    Guid Id,
    string EventType,
    string SourceIp,
    string Description,
    int RiskScore,
    DateTime DetectedAt,
    Guid? IncidentId);

public sealed record TestScenarioResponse(
    string Scenario,
    TestIncidentResponse Incident,
    IReadOnlyList<TestSecurityEventResponse> Events,
    string Message);

public sealed record TestDataClearResponse(
    int DeletedIncidents,
    int DeletedEvents);
