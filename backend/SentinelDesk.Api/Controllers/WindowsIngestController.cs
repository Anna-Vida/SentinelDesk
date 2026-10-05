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

namespace SentinelDesk.Api.Controllers;

[ApiController]
[Route("api/ingest/windows")]
public sealed class WindowsIngestController(
    SentinelDeskDbContext dbContext,
    IHubContext<SecurityHub> hubContext,
    IConfiguration configuration) : ControllerBase
{
    private static readonly string[] SuspiciousPowerShellTerms =
    [
        "-encodedcommand",
        "frombase64string",
        "downloadstring",
        "invoke-expression",
        "invoke-webrequest",
        "iex ",
        "iwr ",
        "certutil",
        "bitsadmin"
    ];

    private static readonly string[] SuspiciousProcessTerms =
    [
        "powershell.exe -enc",
        "powershell.exe -encodedcommand",
        "pwsh.exe -enc",
        "certutil -urlcache",
        "bitsadmin /transfer",
        "rundll32 javascript:",
        "regsvr32 /s /n /u /i:"
    ];

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

        var now = DateTime.UtcNow;
        var createdEvents = new List<SecurityEvent>();
        var createdIncidents = new List<Incident>();

        foreach (var source in request.Events)
        {
            var message = (source.Message ?? string.Empty).Trim();
            if (message.Length > 3000)
                message = message[..3000];

            var commandLine = (source.CommandLine ?? string.Empty).Trim();
            var risk = CalculateRisk(source.EventId, message, commandLine);
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

        var suspiciousPowerShell = createdEvents
            .Where(evt => evt.EventType == "PowerShell Script Block" && evt.RiskScore >= 80)
            .ToList();

        if (suspiciousPowerShell.Count > 0)
        {
            var incident = CreateIncident(
                request.ComputerName,
                "Suspicious PowerShell activity",
                "Windows PowerShell Script Block Logging reported command content matching SentinelDesk high-risk detection rules.",
                IncidentSeverity.Critical,
                now);

            LinkEvents(incident, suspiciousPowerShell);
            createdIncidents.Add(incident);
        }

        var suspiciousProcesses = createdEvents
            .Where(evt => evt.EventType == "Windows Process Created" && evt.RiskScore >= 80)
            .ToList();

        if (suspiciousProcesses.Count > 0)
        {
            var incident = CreateIncident(
                request.ComputerName,
                "Suspicious process execution",
                "Windows process creation auditing reported a command line matching SentinelDesk high-risk execution rules.",
                IncidentSeverity.High,
                now);

            LinkEvents(incident, suspiciousProcesses);
            createdIncidents.Add(incident);
        }

        var failedLogonSourceRecords = request.Events
            .Where(evt => evt.EventId == 4625)
            .GroupBy(evt => NormalizeSourceIp(evt.SourceIp))
            .Where(group => group.Count() >= 5)
            .ToList();

        foreach (var group in failedLogonSourceRecords)
        {
            var matchingEvents = createdEvents
                .Where(evt => evt.EventType == "Windows Failed Logon" && evt.SourceIp == group.Key)
                .ToList();

            if (matchingEvents.Count == 0)
                continue;

            var incident = CreateIncident(
                request.ComputerName,
                $"Repeated failed logons from {group.Key}",
                $"Windows reported {group.Count()} failed logons from the same source in one collector batch.",
                IncidentSeverity.High,
                now);

            LinkEvents(incident, matchingEvents);
            createdIncidents.Add(incident);
        }

        dbContext.Incidents.AddRange(createdIncidents);
        dbContext.SecurityEvents.AddRange(createdEvents);
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

        return Accepted(new WindowsIngestResponse(
            createdEvents.Count,
            createdIncidents.Count,
            createdEvents.Max(evt => evt.DetectedAt)));
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

        return CryptographicOperations.FixedTimeEquals(expectedBytes, suppliedBytes);
    }

    private static int CalculateRisk(int eventId, string message, string commandLine)
    {
        var combined = $"{message} {commandLine}";

        return eventId switch
        {
            4625 => 55,
            4104 when ContainsAny(combined, SuspiciousPowerShellTerms) => 92,
            4104 => 35,
            4688 when ContainsAny(combined, SuspiciousProcessTerms) => 88,
            4688 => 25,
            _ => 20
        };
    }

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
        string computerName,
        string title,
        string description,
        IncidentSeverity severity,
        DateTime createdAt) =>
        new()
        {
            Id = Guid.NewGuid(),
            Title = $"[WINDOWS] {title} — {computerName}",
            Description = description,
            Severity = severity,
            Status = IncidentStatus.Open,
            IsArchived = false,
            CreatedAt = createdAt,
            UpdatedAt = createdAt
        };

    private static void LinkEvents(Incident incident, IEnumerable<SecurityEvent> events)
    {
        foreach (var securityEvent in events)
            securityEvent.IncidentId = incident.Id;
    }
}

public sealed class WindowsEventBatchRequest
{
    public string ComputerName { get; init; } = string.Empty;
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

public sealed record WindowsIngestResponse(
    int AcceptedEvents,
    int CreatedIncidents,
    DateTime LatestEventAt);

public sealed record WindowsCollectorStatusResponse(
    bool Configured,
    DateTime? LastEventAt,
    int EventsLast24Hours);

public sealed record WindowsCollectorSetupResponse(
    string ApiUrl,
    string ApiKey,
    string ScriptUrl);
