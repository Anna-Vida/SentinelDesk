using SentinelDesk.Api.Models;
using SentinelDesk.Api.Services;

namespace SentinelDesk.Api.Tests;

public sealed class IncidentWorkflowTests
{
    [Theory]
    [InlineData(IncidentStatus.Open, IncidentStatus.Investigating)]
    [InlineData(IncidentStatus.Investigating, IncidentStatus.Contained)]
    [InlineData(IncidentStatus.Contained, IncidentStatus.Resolved)]
    [InlineData(IncidentStatus.Resolved, IncidentStatus.Closed)]
    public void CanTransition_AllowsOnlyTheNextWorkflowState(
        IncidentStatus current,
        IncidentStatus requested)
    {
        Assert.True(IncidentWorkflow.CanTransition(current, requested));
    }

    [Theory]
    [InlineData(IncidentStatus.Open, IncidentStatus.Resolved)]
    [InlineData(IncidentStatus.Open, IncidentStatus.Closed)]
    [InlineData(IncidentStatus.Investigating, IncidentStatus.Resolved)]
    [InlineData(IncidentStatus.Contained, IncidentStatus.Closed)]
    [InlineData(IncidentStatus.Resolved, IncidentStatus.Open)]
    [InlineData(IncidentStatus.Closed, IncidentStatus.Open)]
    [InlineData(IncidentStatus.Closed, IncidentStatus.Investigating)]
    public void CanTransition_RejectsSkippedBackwardAndTerminalTransitions(
        IncidentStatus current,
        IncidentStatus requested)
    {
        Assert.False(IncidentWorkflow.CanTransition(current, requested));
    }

    [Fact]
    public void TryGetNext_ClosedIsTerminal()
    {
        Assert.False(IncidentWorkflow.TryGetNext(IncidentStatus.Closed, out _));
    }

    [Fact]
    public void DescribeInvalidTransition_ExplainsExpectedNextState()
    {
        var message = IncidentWorkflow.DescribeInvalidTransition(
            IncidentStatus.Open,
            IncidentStatus.Closed);

        Assert.Contains("Investigating", message);
    }
}
