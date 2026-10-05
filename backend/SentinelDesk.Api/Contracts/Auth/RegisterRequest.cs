using System.ComponentModel.DataAnnotations;
using SentinelDesk.Api.Models;

namespace SentinelDesk.Api.Contracts.Auth;

public sealed class RegisterRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string DisplayName { get; init; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(320)]
    public string Email { get; init; } = string.Empty;

    [Required]
    [StringLength(128, MinimumLength = 8)]
    public string Password { get; init; } = string.Empty;

    public UserRole? Role { get; init; }
}
