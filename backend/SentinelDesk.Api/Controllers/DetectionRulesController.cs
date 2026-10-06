using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SentinelDesk.Api.Data;
using SentinelDesk.Api.Models;
using SentinelDesk.Api.Security;

namespace SentinelDesk.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/detection-rules")]
public sealed class DetectionRulesController(SentinelDeskDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DetectionRuleResponse>>> GetRules(CancellationToken cancellationToken)
    {
        var rules = await dbContext.DetectionRules
            .AsNoTracking()
            .OrderBy(rule => rule.Name)
            .ToListAsync(cancellationToken);

        return Ok(rules.Select(ToResponse).ToList());
    }

    [Authorize(Roles = RoleNames.Admin)]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DetectionRuleResponse>> UpdateRule(
        Guid id,
        UpdateDetectionRuleRequest request,
        CancellationToken cancellationToken)
    {
        var rule = await dbContext.DetectionRules.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (rule is null) return NotFound();
        if (request.TriggerCount is < 1 or > 1000)
            return BadRequest(new ProblemDetails { Title = "Trigger count must be between 1 and 1000." });
        if (request.WindowMinutes is < 1 or > 1440)
            return BadRequest(new ProblemDetails { Title = "Window must be between 1 and 1440 minutes." });
        if (request.RiskScore is < 0 or > 100)
            return BadRequest(new ProblemDetails { Title = "Risk score must be between 0 and 100." });

        rule.IsEnabled = request.IsEnabled;
        rule.Severity = request.Severity;
        rule.TriggerCount = request.TriggerCount;
        rule.WindowMinutes = request.WindowMinutes;
        rule.RiskScore = request.RiskScore;
        rule.MatchPatterns = request.MatchPatterns?.Trim() ?? string.Empty;
        rule.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(rule));
    }

    private static DetectionRuleResponse ToResponse(DetectionRule rule) =>
        new(rule.Id, rule.RuleKey, rule.Name, rule.Description, rule.IsEnabled, rule.Severity,
            rule.TriggerCount, rule.WindowMinutes, rule.RiskScore, rule.MatchPatterns, rule.UpdatedAt);
}

public sealed record UpdateDetectionRuleRequest(
    bool IsEnabled,
    IncidentSeverity Severity,
    int TriggerCount,
    int WindowMinutes,
    int RiskScore,
    string? MatchPatterns);

public sealed record DetectionRuleResponse(
    Guid Id,
    string RuleKey,
    string Name,
    string Description,
    bool IsEnabled,
    IncidentSeverity Severity,
    int TriggerCount,
    int WindowMinutes,
    int RiskScore,
    string MatchPatterns,
    DateTime UpdatedAt);
