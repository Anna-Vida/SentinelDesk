namespace SentinelDesk.Api.Models;

public sealed class AppUser
{
    public Guid Id { get; set; }
    public required string Email { get; set; }
    public required string DisplayName { get; set; }
    public required string PasswordHash { get; set; }
    public UserRole Role { get; set; }
    public bool IsApproved { get; set; }
    public DateTime CreatedAt { get; set; }
}
