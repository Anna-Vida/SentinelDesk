namespace SentinelDesk.Api.Contracts.RealTime;

public sealed record IncidentCreatedMessage(
    Guid Id,
    string Title,
    string Description,
    string Severity,
    string Status,
    DateTime CreatedAt
);

public sealed record IncidentUpdatedMessage(
    Guid Id,
    string Title,
    string Description,
    string Severity,
    DateTime UpdatedAt
);

public sealed record IncidentStatusChangedMessage(
    Guid IncidentId,
    string PreviousStatus,
    string NewStatus,
    DateTime UpdatedAt
);

public sealed record IncidentArchivedMessage(
    Guid IncidentId,
    DateTime ArchivedAt
);

public sealed record SecurityEventCreatedMessage(
    Guid Id,
    string EventType,
    string SourceIp,
    string Description,
    int RiskScore,
    DateTime DetectedAt,
    Guid? IncidentId
);

public sealed record SecurityEventLinkedMessage(
    Guid EventId,
    Guid IncidentId,
    DateTime LinkedAt
);
