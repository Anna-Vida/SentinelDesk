using Microsoft.AspNetCore.SignalR;

namespace SentinelDesk.Api.Hubs;

/// <summary>
/// SignalR hub for streaming real-time security alerts and incident updates to connected SOC dashboards.
/// </summary>
public sealed class SecurityHub(ILogger<SecurityHub> logger) : Hub
{
    public override async Task OnConnectedAsync()
    {
        logger.LogInformation("SignalR client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (exception is not null)
        {
            logger.LogWarning(exception, "SignalR client disconnected with error: {ConnectionId}", Context.ConnectionId);
        }
        else
        {
            logger.LogInformation("SignalR client disconnected cleanly: {ConnectionId}", Context.ConnectionId);
        }

        await base.OnDisconnectedAsync(exception);
    }
}
