using System.ComponentModel.DataAnnotations;
using SentinelDesk.Api.Models;

namespace SentinelDesk.Api.Contracts.Users;

public sealed class ApproveUserRequest
{
    [Required]
    public UserRole? Role { get; init; }
}
