namespace SentinelDesk.Api.Models;

public static class DetectionRuleKeys
{
    public const string FailedLogonBurst = "failed-logon-burst";
    public const string SuspiciousPowerShell = "suspicious-powershell";
    public const string SuspiciousProcess = "suspicious-process";
}

public sealed class DetectionRule
{
    public Guid Id { get; set; }
    public required string RuleKey { get; set; }
    public required string Name { get; set; }
    public required string Description { get; set; }
    public bool IsEnabled { get; set; } = true;
    public IncidentSeverity Severity { get; set; }
    public int TriggerCount { get; set; }
    public int WindowMinutes { get; set; }
    public int RiskScore { get; set; }
    public string MatchPatterns { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}
