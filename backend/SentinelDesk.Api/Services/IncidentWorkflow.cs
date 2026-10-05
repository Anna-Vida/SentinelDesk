using SentinelDesk.Api.Models;

namespace SentinelDesk.Api.Services;

public static class IncidentWorkflow
{
    private static readonly IReadOnlyDictionary<IncidentStatus, IncidentStatus> AllowedTransitions =
        new Dictionary<IncidentStatus, IncidentStatus>
        {
            [IncidentStatus.Open] = IncidentStatus.Investigating,
            [IncidentStatus.Investigating] = IncidentStatus.Contained,
            [IncidentStatus.Contained] = IncidentStatus.Resolved,
            [IncidentStatus.Resolved] = IncidentStatus.Closed,
        };

    public static bool TryGetNext(IncidentStatus current, out IncidentStatus next) =>
        AllowedTransitions.TryGetValue(current, out next);

    public static bool CanTransition(IncidentStatus current, IncidentStatus requested) =>
        TryGetNext(current, out var next) && next == requested;

    public static string DescribeInvalidTransition(IncidentStatus current, IncidentStatus requested) =>
        TryGetNext(current, out var next)
            ? $"Cannot transition from '{current}' to '{requested}'. The only allowed next status is '{next}'."
            : $"'{current}' is a terminal status. No further transitions are allowed.";
}
