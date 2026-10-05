namespace SentinelDesk.Api.Contracts.Auth;

public sealed record AuthUserResponse(Guid Id, string Email, string DisplayName, string Role);

public sealed record AuthResponse(string Token, DateTime ExpiresAt, AuthUserResponse User);

public sealed record BootstrapStatusResponse(bool RequiresSetup);

public sealed record AccessRequestResponse(
    Guid Id,
    string Email,
    string DisplayName,
    string Status
);
