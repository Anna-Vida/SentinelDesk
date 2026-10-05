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
        var hasUsers = await dbContext.Users.AsNoTracking().AnyAsync(cancellationToken);
        return Ok(new BootstrapStatusResponse(!hasUsers));
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        if (await dbContext.Users.AnyAsync(cancellationToken))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails
            {
                Title = "Registration is closed",
                Detail = "The workspace is already initialized. Ask an Admin to create your account.",
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

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = displayName,
            PasswordHash = string.Empty,
            Role = UserRole.Admin,
            CreatedAt = DateTime.UtcNow
        };

        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        dbContext.Users.Add(user);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Workspace initialization conflict",
                Detail = "The workspace was initialized by another request. Sign in or ask an Admin for an account.",
                Status = StatusCodes.Status409Conflict,
                Instance = HttpContext.Request.Path
            });
        }

        return Ok(CreateAuthResponse(user));
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
