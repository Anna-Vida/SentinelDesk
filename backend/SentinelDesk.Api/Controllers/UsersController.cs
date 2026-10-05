using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SentinelDesk.Api.Contracts.Users;
using SentinelDesk.Api.Data;
using SentinelDesk.Api.Models;
using SentinelDesk.Api.Security;

namespace SentinelDesk.Api.Controllers;

[Authorize(Roles = RoleNames.Admin)]
[ApiController]
[Route("api/users")]
public sealed class UsersController(
    SentinelDeskDbContext dbContext,
    IPasswordHasher<AppUser> passwordHasher) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var users = await dbContext.Users
            .AsNoTracking()
            .OrderBy(user => user.DisplayName)
            .Select(user => new UserResponse(
                user.Id,
                user.Email,
                user.DisplayName,
                user.Role.ToString(),
                user.CreatedAt))
            .ToListAsync(cancellationToken);

        return Ok(users);
    }

    [HttpPost]
    public async Task<ActionResult<UserResponse>> Create(
        CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var displayName = request.DisplayName.Trim();

        if (string.IsNullOrWhiteSpace(displayName))
        {
            ModelState.AddModelError(nameof(request.DisplayName), "Display name is required.");
            return ValidationProblem(ModelState);
        }

        if (await dbContext.Users.AnyAsync(user => user.Email == email, cancellationToken))
        {
            return Conflict(new ProblemDetails
            {
                Title = "Account already exists",
                Detail = "An account with that email address already exists.",
                Status = StatusCodes.Status409Conflict,
                Instance = HttpContext.Request.Path
            });
        }

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = displayName,
            PasswordHash = string.Empty,
            Role = request.Role,
            CreatedAt = DateTime.UtcNow
        };

        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = new UserResponse(
            user.Id,
            user.Email,
            user.DisplayName,
            user.Role.ToString(),
            user.CreatedAt);

        return Created("/api/users", response);
    }
}
