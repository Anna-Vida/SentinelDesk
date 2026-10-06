using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SentinelDesk.Api.Contracts.RealTime;
using SentinelDesk.Api.Data;
using SentinelDesk.Api.Hubs;
using SentinelDesk.Api.Models;
using SentinelDesk.Api.Security;
using ManagedEndpoint = SentinelDesk.Api.Models.Endpoint;

namespace SentinelDesk.Api.Controllers;

[ApiController]
[Route("api/ingest/windows")]
public sealed class WindowsIngestController(
    SentinelDeskDbContext dbContext,
    IHubContext<SecurityHub> hubContext,
    IConfiguration configuration) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("heartbeat")]
    public async Task<ActionResult<WindowsHeartbeatResponse>> Heartbeat(
        WindowsHeartbeatRequest request,
        CancellationToken cancellationToken)
    {
        if (!HasValidAgentKey())
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.ComputerName))
            return BadRequest(new ProblemDetails { Title = "Computer name is required." });

        var endpoint = await UpsertEndpointAsync(
            request.ComputerName,
            request.OsName,
            request.OsVersion,
            request.AgentVersion,
            cancellationToken);

        if (!endpoint.IsEnabled)
            return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails { Title = "This endpoint is disabled in SentinelDesk." });

        await dbContext.SaveChangesAsync(cancellationToken);
        await BroadcastEndpointAsync(endpoint, cancellationToken);

        return Ok(new WindowsHeartbeatResponse(endpoint.Id, endpoint.ComputerName, endpoint.LastSeenAt, endpoint.IsEnabled));
    }

    [AllowAnonymous]
    [HttpPost]
    public async Task<ActionResult<WindowsIngestResponse>> Ingest(
        WindowsEventBatchRequest request,
        CancellationToken cancellationToken)
    {
        if (!HasValidAgentKey())
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.ComputerName))
            return BadRequest(new ProblemDetails { Title = "Computer name is required." });

        if (request.Events.Count is < 1 or > 200)
            return BadRequest(new ProblemDetails { Title = "Send between 1 and 200 events per batch." });

        var endpoint = await UpsertEndpointAsync(
            request.ComputerName,
            request.OsName,
            request.OsVersion,
            request.AgentVersion,
            cancellationToken);

        if (!endpoint.IsEnabled)
            return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails { Title = "This endpoint is disabled in SentinelDesk." });

        var rules = await dbContext.DetectionRules
            .AsNoTracking()
            .ToDictionaryAsync(rule => rule.RuleKey, cancellationToken);

        rules.TryGetValue(DetectionRuleKeys.FailedLogonBurst, out var failedLogonRule);
        rules.TryGetValue(DetectionRuleKeys.SuspiciousPowerShell, out var powerShellRule);
        rules.TryGetValue(DetectionRuleKeys.SuspiciousProcess, out var processRule);

        var now = DateTime.UtcNow;
        var createdEvents = new List<SecurityEvent>();
        var createdIncidents = new List<Incident>();

        foreach (var source in request.Events)
        {
            var message = (source.Message ?? string.Empty).Trim();
            if (message.Length > 3000)
                message = message[..3000];

            var commandLine = (source.CommandLine ?? string.Empty).Trim();
            var risk = CalculateRisk(source.EventId, message, commandLine, failedLogonRule, powerShellRule, processRule);
            var eventType = source.EventId switch
            {
                4625 => "Windows Failed Logon",
                4688 => "Windows Process Created",
                4104 => "PowerShell Script Block",
                _ => $"Windows Event {source.EventId}"
            };

            var securityEvent = new SecurityEvent
            {
                Id = Guid.NewGuid(),
                EndpointId = endpoint.Id,
                EventType = eventType,
                SourceIp = NormalizeSourceIp(source.SourceIp),
                Description = BuildDescription(request.ComputerName, source, message, commandLine),
                RiskScore = risk,
                DetectedAt = source.OccurredAt.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(source.OccurredAt, DateTimeKind.Utc)
                    : source.OccurredAt.ToUniversalTime()
            };

            createdEvents.Add(securityEvent);
        }

        var suspiciousPowerShell = powerShellRule is { IsEnabled: true }
            ? createdEvents.Where(evt => evt.EventType == "PowerShell Script Block" && evt.RiskScore >= powerShellRule.RiskScore).ToList()
            : [];

        if (suspiciousPowerShell.Count >= (powerShellRule?.TriggerCount ?? int.MaxValue))
        {
            var incident = CreateIncident(
                endpoint,
                "Suspicious PowerShell activity",
                "Windows PowerShell Script Block Logging reported command content matching SentinelDesk high-risk detection rules.",
                powerShellRule!.Severity,
                now);

            LinkEvents(incident, suspiciousPowerShell);
            createdIncidents.Add(incident);
        }

        var suspiciousProcesses = processRule is { IsEnabled: true }
            ? createdEvents.Where(evt => evt.EventType == "Windows Process Created" && evt.RiskScore >= processRule.RiskScore).ToList()
            : [];

        if (suspiciousProcesses.Count >= (processRule?.TriggerCount ?? int.MaxValue))
        {
            var incident = CreateIncident(
                endpoint,
                "Suspicious process execution",
                "Windows process creation auditing reported a command line matching SentinelDesk high-risk execution rules.",
                processRule!.Severity,
                now);

            LinkEvents(incident, suspiciousProcesses);
            createdIncidents.Add(incident);
        }

        var failedLogonSourceRecords = failedLogonRule is { IsEnabled: true }
            ? request.Events
                .Where(evt => evt.EventId == 4625)
                .GroupBy(evt => NormalizeSourceIp(evt.SourceIp))
                .Where(group => group.Count() >= failedLogonRule.TriggerCount)
                .ToList()
            : [];

        foreach (var group in failedLogonSourceRecords)
        {
            var matchingEvents = createdEvents
                .Where(evt => evt.EventType == "Windows Failed Logon" && evt.SourceIp == group.Key)
                .ToList();

            if (matchingEvents.Count == 0)
                continue;

            var incident = CreateIncident(
                endpoint,
                $"Repeated failed logons from {group.Key}",
                $"Windows reported {group.Count()} failed logons from the same source in one collector batch.",
                failedLogonRule!.Severity,
                now);

            LinkEvents(incident, matchingEvents);
            createdIncidents.Add(incident);
        }

        dbContext.Incidents.AddRange(createdIncidents);
        dbContext.SecurityEvents.AddRange(createdEvents);

        endpoint.LastEventAt = createdEvents.Max(evt => evt.DetectedAt);
        await dbContext.SaveChangesAsync(cancellationToken);

        foreach (var incident in createdIncidents)
        {
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
        }

        foreach (var securityEvent in createdEvents)
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

        await BroadcastEndpointAsync(endpoint, cancellationToken);

        return Accepted(new WindowsIngestResponse(
            createdEvents.Count,
            createdIncidents.Count,
            createdEvents.Max(evt => evt.DetectedAt),
            endpoint.Id));
    }

    [Authorize(Roles = RoleNames.Admin)]
    [HttpGet("status")]
    public async Task<ActionResult<WindowsCollectorStatusResponse>> GetStatus(
        CancellationToken cancellationToken)
    {
        var cutoff = DateTime.UtcNow.AddHours(-24);

        var windowsEvents = dbContext.SecurityEvents.AsNoTracking()
            .Where(evt =>
                evt.EventType.StartsWith("Windows ") ||
                evt.EventType.StartsWith("PowerShell "));

        var lastEventAt = await windowsEvents
            .OrderByDescending(evt => evt.DetectedAt)
            .Select(evt => (DateTime?)evt.DetectedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var eventsLast24Hours = await windowsEvents
            .CountAsync(evt => evt.DetectedAt >= cutoff, cancellationToken);

        return Ok(new WindowsCollectorStatusResponse(
            !string.IsNullOrWhiteSpace(configuration["Ingestion:ApiKey"]),
            lastEventAt,
            eventsLast24Hours));
    }

    [Authorize(Roles = RoleNames.Admin)]
    [HttpGet("setup")]
    public ActionResult<WindowsCollectorSetupResponse> GetSetup()
    {
        var apiKey = configuration["Ingestion:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails
            {
                Title = "Windows ingestion key is not configured."
            });
        }

        var configuredPublicUrl = configuration["Ingestion:PublicApiUrl"];
        var apiUrl = string.IsNullOrWhiteSpace(configuredPublicUrl)
            ? $"{Request.Scheme}://{Request.Host}"
            : configuredPublicUrl.TrimEnd('/');

        return Ok(new WindowsCollectorSetupResponse(
            apiUrl,
            apiKey,
            "https://raw.githubusercontent.com/Anna-Vida/SentinelDesk/main/agents/windows/SentinelDeskAgent.ps1"));
    }

    private async Task<ManagedEndpoint> UpsertEndpointAsync(
        string computerName,
        string? osName,
        string? osVersion,
        string? agentVersion,
        CancellationToken cancellationToken)
    {
        var normalizedName = computerName.Trim();
        var now = DateTime.UtcNow;
        var endpoint = await dbContext.Endpoints
            .SingleOrDefaultAsync(
                item => item.ComputerName.ToLower() == normalizedName.ToLower(),
                cancellationToken);

        if (endpoint is null)
        {
            endpoint = new ManagedEndpoint
            {
                Id = Guid.NewGuid(),
                ComputerName = normalizedName,
                OsName = Clean(osName, 255),
                OsVersion = Clean(osVersion, 100),
                AgentVersion = Clean(agentVersion, 50),
                LastIpAddress = Request.HttpContext.Connection.RemoteIpAddress?.ToString(),
                IsEnabled = true,
                FirstSeenAt = now,
                LastSeenAt = now
            };
            dbContext.Endpoints.Add(endpoint);
        }
        else
        {
            endpoint.OsName = Clean(osName, 255) ?? endpoint.OsName;
            endpoint.OsVersion = Clean(osVersion, 100) ?? endpoint.OsVersion;
            endpoint.AgentVersion = Clean(agentVersion, 50) ?? endpoint.AgentVersion;
            endpoint.LastIpAddress = Request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? endpoint.LastIpAddress;
            endpoint.LastSeenAt = now;
        }

        return endpoint;
    }

    private async Task BroadcastEndpointAsync(ManagedEndpoint endpoint, CancellationToken cancellationToken)
    {
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
    }

    private bool HasValidAgentKey()
    {
        var expected = configuration["Ingestion:ApiKey"];
        if (string.IsNullOrWhiteSpace(expected) ||
            !Request.Headers.TryGetValue("X-Sentinel-Key", out var suppliedValues))
        {
            return false;
        }

        var supplied = suppliedValues.ToString();
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var suppliedBytes = Encoding.UTF8.GetBytes(supplied);

        return expectedBytes.Length == suppliedBytes.Length &&
               CryptographicOperations.FixedTimeEquals(expectedBytes, suppliedBytes);
    }

    private static string? Clean(string? value, int maxLength)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            return null;

        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static int CalculateRisk(
        int eventId,
        string message,
        string commandLine,
        DetectionRule? failedLogonRule,
        DetectionRule? powerShellRule,
        DetectionRule? processRule)
    {
        var combined = $"{message} {commandLine}";

        return eventId switch
        {
            4625 => failedLogonRule?.RiskScore ?? 55,
            4104 when powerShellRule is not null && ContainsAny(combined, SplitPatterns(powerShellRule.MatchPatterns))
                => powerShellRule.RiskScore,
            4104 => 35,
            4688 when processRule is not null && ContainsAny(combined, SplitPatterns(processRule.MatchPatterns))
                => processRule.RiskScore,
            4688 => 25,
            _ => 20
        };
    }

    private static IEnumerable<string> SplitPatterns(string patterns) =>
        patterns.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    private static bool ContainsAny(string value, IEnumerable<string> terms) =>
        terms.Any(term => value.Contains(term, StringComparison.OrdinalIgnoreCase));

    private static string NormalizeSourceIp(string? value)
    {
        var candidate = value?.Trim();
        return string.IsNullOrWhiteSpace(candidate) || candidate == "-"
            ? "0.0.0.0"
            : candidate;
    }

    private static string BuildDescription(
        string computerName,
        WindowsEventRecordRequest source,
        string message,
        string commandLine)
    {
        var detail = source.EventId switch
        {
            4625 => $"Failed logon on {computerName}. User: {source.UserName ?? "unknown"}. {message}",
            4688 => $"Process created on {computerName}. User: {source.UserName ?? "unknown"}. Command: {commandLine}. {message}",
            4104 => $"PowerShell script block on {computerName}. User: {source.UserName ?? "unknown"}. {message}",
            _ => $"Windows event {source.EventId} on {computerName}. {message}"
        };

        return detail.Length <= 3000 ? detail : detail[..3000];
    }

    private static Incident CreateIncident(
        ManagedEndpoint endpoint,
        string title,
        string description,
        IncidentSeverity severity,
        DateTime createdAt)
    {
        var incident = new Incident
        {
            Id = Guid.NewGuid(),
            EndpointId = endpoint.Id,
            Title = $"[WINDOWS] {title} — {endpoint.ComputerName}",
            Description = description,
            Severity = severity,
            Status = IncidentStatus.Open,
            IsArchived = false,
            CreatedAt = createdAt,
            UpdatedAt = createdAt
        };

        incident.Activities.Add(new IncidentActivity
        {
            Id = Guid.NewGuid(),
            IncidentId = incident.Id,
            ActivityType = IncidentActivityTypes.Detection,
            Message = "Incident created automatically from Windows telemetry by the SentinelDesk detection engine.",
            ActorUserId = null,
            ActorDisplayName = "SentinelDesk Detection Engine",
            CreatedAt = createdAt
        });

        return incident;
    }

    private static void LinkEvents(Incident incident, IEnumerable<SecurityEvent> events)
    {
        foreach (var securityEvent in events)
            securityEvent.IncidentId = incident.Id;
    }
}

public sealed class WindowsHeartbeatRequest
{
    public string ComputerName { get; init; } = string.Empty;
    public string? OsName { get; init; }
    public string? OsVersion { get; init; }
    public string? AgentVersion { get; init; }
}

public sealed class WindowsEventBatchRequest
{
    public string ComputerName { get; init; } = string.Empty;
    public string? OsName { get; init; }
    public string? OsVersion { get; init; }
    public string? AgentVersion { get; init; }
    public IReadOnlyList<WindowsEventRecordRequest> Events { get; init; } = [];
}

public sealed class WindowsEventRecordRequest
{
    public int EventId { get; init; }
    public string LogName { get; init; } = string.Empty;
    public long RecordId { get; init; }
    public string? Provider { get; init; }
    public string? Level { get; init; }
    public string? Message { get; init; }
    public DateTime OccurredAt { get; init; }
    public string? SourceIp { get; init; }
    public string? UserName { get; init; }
    public string? CommandLine { get; init; }
}

public sealed record WindowsHeartbeatResponse(
    Guid EndpointId,
    string ComputerName,
    DateTime LastSeenAt,
    bool IsEnabled);

public sealed record WindowsIngestResponse(
    int AcceptedEvents,
    int CreatedIncidents,
    DateTime LatestEventAt,
    Guid EndpointId);

public sealed record WindowsCollectorStatusResponse(
    bool Configured,
    DateTime? LastEventAt,
    int EventsLast24Hours);

public sealed record WindowsCollectorSetupResponse(
    string ApiUrl,
    string ApiKey,
    string ScriptUrl);
