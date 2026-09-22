namespace SentinelDesk.Api.Contracts.RealTime;

/// <summary>
/// Centralized SignalR event names broadcast across the /hubs/security endpoint.
/// </summary>
public static class SecurityHubEvents
{
    public const string IncidentCreated = "IncidentCreated";
    public const string IncidentUpdated = "IncidentUpdated";
    public const string IncidentStatusChanged = "IncidentStatusChanged";
    public const string IncidentArchived = "IncidentArchived";
    public const string SecurityEventCreated = "SecurityEventCreated";
    public const string SecurityEventLinked = "SecurityEventLinked";
}
