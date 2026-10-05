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
            .OrderBy(user => user.IsApproved)
            .ThenBy(user => user.DisplayName)
            .Select(user => new UserResponse(
                user.Id,
                user.Email,
                user.DisplayName,
                user.Role.ToString(),
                user.IsApproved,
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
                Detail = "An account or pending request already uses that email address.",
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
            Role = request.Role!.Value,
            IsApproved = true,
            CreatedAt = DateTime.UtcNow
        };

        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Created("/api/users", ToResponse(user));
    }

    [HttpPatch("{id:guid}/approval")]
    public async Task<ActionResult<UserResponse>> Approve(
        Guid id,
        ApproveUserRequest request,
        CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.SingleOrDefaultAsync(
            candidate => candidate.Id == id,
            cancellationToken);

        if (user is null)
            return NotFound();

        if (user.IsApproved)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Account is already approved",
                Detail = "Use normal account management for approved users.",
                Status = StatusCodes.Status409Conflict,
                Instance = HttpContext.Request.Path
            });
        }

        if (request.Role is not (UserRole.Viewer or UserRole.Analyst))
        {
            ModelState.AddModelError(nameof(request.Role), "Access requests can be approved only as Viewer or Analyst.");
            return ValidationProblem(ModelState);
        }

        user.Role = request.Role.Value;
        user.IsApproved = true;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(user));
    }

    [HttpDelete("{id:guid}/request")]
    public async Task<IActionResult> Reject(
        Guid id,
        CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.SingleOrDefaultAsync(
            candidate => candidate.Id == id,
            cancellationToken);

        if (user is null)
            return NotFound();

        if (user.IsApproved)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Approved accounts cannot be rejected",
                Detail = "This endpoint only removes pending access requests.",
                Status = StatusCodes.Status409Conflict,
                Instance = HttpContext.Request.Path
            });
        }

        dbContext.Users.Remove(user);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static UserResponse ToResponse(AppUser user) =>
        new(
            user.Id,
            user.Email,
            user.DisplayName,
            user.Role.ToString(),
            user.IsApproved,
            user.CreatedAt);
}
