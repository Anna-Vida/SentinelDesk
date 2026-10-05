using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SentinelDesk.Api.Contracts.Auth;
using SentinelDesk.Api.Data;
using SentinelDesk.Api.Models;

namespace SentinelDesk.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    SentinelDeskDbContext dbContext,
    IPasswordHasher<AppUser> passwordHasher,
    IConfiguration configuration) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("bootstrap-status")]
    public async Task<ActionResult<BootstrapStatusResponse>> GetBootstrapStatus(
        CancellationToken cancellationToken)
    {
        var hasApprovedUsers = await dbContext.Users
            .AsNoTracking()
            .AnyAsync(user => user.IsApproved, cancellationToken);

        return Ok(new BootstrapStatusResponse(!hasApprovedUsers));
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        if (await dbContext.Users.AnyAsync(user => user.IsApproved, cancellationToken))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails
            {
                Title = "Workspace already initialized",
                Detail = "Use Sign in or Request access.",
                Status = StatusCodes.Status403Forbidden,
                Instance = HttpContext.Request.Path
            });
        }

        var displayName = request.DisplayName.Trim();
        var email = request.Email.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(displayName))
        {
            ModelState.AddModelError(nameof(request.DisplayName), "Display name is required.");
            return ValidationProblem(ModelState);
        }

        if (await dbContext.Users.AnyAsync(user => user.Email == email, cancellationToken))
        {
            return Conflict(new ProblemDetails
            {
                Title = "Email already in use",
                Detail = "Use a different email address for the Admin account.",
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
            Role = UserRole.Admin,
            IsApproved = true,
            CreatedAt = DateTime.UtcNow
        };

        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(CreateAuthResponse(user));
    }

    [AllowAnonymous]
    [HttpPost("request-access")]
    public async Task<ActionResult<AccessRequestResponse>> RequestAccess(
        RequestAccessRequest request,
        CancellationToken cancellationToken)
    {
        var workspaceReady = await dbContext.Users
            .AsNoTracking()
            .AnyAsync(user => user.IsApproved, cancellationToken);

        if (!workspaceReady)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Workspace setup required",
                Detail = "The first Admin must initialize this SentinelDesk workspace before access can be requested.",
                Status = StatusCodes.Status409Conflict,
                Instance = HttpContext.Request.Path
            });
        }

        var displayName = request.DisplayName.Trim();
        var email = request.Email.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(displayName))
        {
            ModelState.AddModelError(nameof(request.DisplayName), "Display name is required.");
            return ValidationProblem(ModelState);
        }

        var existing = await dbContext.Users
            .SingleOrDefaultAsync(user => user.Email == email, cancellationToken);

        if (existing is not null)
        {
            return Conflict(new ProblemDetails
            {
                Title = existing.IsApproved ? "Account already exists" : "Access request already pending",
                Detail = existing.IsApproved
                    ? "Sign in with this email address."
                    : "An Admin still needs to approve this access request.",
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
            Role = UserRole.Viewer,
            IsApproved = false,
            CreatedAt = DateTime.UtcNow
        };

        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Accepted(new AccessRequestResponse(
            user.Id,
            user.Email,
            user.DisplayName,
            "Pending"));
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await dbContext.Users.SingleOrDefaultAsync(
            candidate => candidate.Email == email,
            cancellationToken);

        if (user is null)
            return InvalidCredentials();

        var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
            return InvalidCredentials();

        if (!user.IsApproved)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails
            {
                Title = "Access request pending",
                Detail = "Your account exists, but a SentinelDesk Admin still needs to approve it.",
                Status = StatusCodes.Status403Forbidden,
                Instance = HttpContext.Request.Path
            });
        }

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return Ok(CreateAuthResponse(user));
    }

    private ActionResult<AuthResponse> InvalidCredentials() =>
        Unauthorized(new ProblemDetails
        {
            Title = "Invalid credentials",
            Detail = "Email or password is incorrect.",
            Status = StatusCodes.Status401Unauthorized,
            Instance = HttpContext.Request.Path
        });

    private AuthResponse CreateAuthResponse(AppUser user)
    {
        var key = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("JWT signing key is not configured.");
        var issuer = configuration["Jwt:Issuer"] ?? "SentinelDesk";
        var audience = configuration["Jwt:Audience"] ?? "SentinelDesk.Web";
        var expiresAt = DateTime.UtcNow.AddHours(8);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return new AuthResponse(
            new JwtSecurityTokenHandler().WriteToken(token),
            expiresAt,
            new AuthUserResponse(user.Id, user.Email, user.DisplayName, user.Role.ToString()));
    }
}
