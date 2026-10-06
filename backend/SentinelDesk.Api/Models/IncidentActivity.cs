namespace SentinelDesk.Api.Models;

public static class IncidentActivityTypes
{
    public const string Created = "Created";
    public const string Updated = "Updated";
    public const string StatusChanged = "StatusChanged";
    public const string AssignmentChanged = "AssignmentChanged";
    public const string Note = "Note";
    public const string Archived = "Archived";
    public const string Detection = "Detection";
}

public sealed class IncidentActivity
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public Incident? Incident { get; set; }
    public required string ActivityType { get; set; }
    public required string Message { get; set; }
    public Guid? ActorUserId { get; set; }
    public required string ActorDisplayName { get; set; }
    public DateTime CreatedAt { get; set; }
}
