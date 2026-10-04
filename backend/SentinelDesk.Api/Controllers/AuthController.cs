using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace SentinelDesk.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(UserManager<IdentityUser> users, SignInManager<IdentityUser> signIn,
    RoleManager<IdentityRole> roles, IAntiforgery antiforgery) : ControllerBase
{
    [HttpGet("csrf"), AllowAnonymous]
    public IActionResult Csrf()
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(new { token = antiforgery.GetAndStoreTokens(HttpContext).RequestToken });
    }

    [HttpPost("login"), AllowAnonymous, EnableRateLimiting("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var result = await signIn.PasswordSignInAsync(request.Email.Trim(), request.Password, false, lockoutOnFailure: true);
        if (!result.Succeeded) return Problem(statusCode: 401, detail: "Sign-in failed. Check your credentials or try again later.");
        var user = await users.FindByEmailAsync(request.Email.Trim());
        return Ok(await Describe(user!));
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        Response.Headers.CacheControl = "no-store";
        var user = await users.GetUserAsync(User);
        return user is null ? Unauthorized() : Ok(await Describe(user));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout() { await signIn.SignOutAsync(); return NoContent(); }

    [HttpPost("password")]
    public async Task<IActionResult> Password(ChangePasswordRequest request)
    {
        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();
        var result = await users.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded) return Problem(statusCode: 400, detail: string.Join(" ", result.Errors.Select(error => error.Description)));
        await signIn.RefreshSignInAsync(user);
        return NoContent();
    }

    [HttpGet("users"), Authorize(Policy = "Admin")]
    public async Task<IActionResult> ListUsers()
    {
        var result = new List<object>();
        foreach (var user in await users.Users.OrderBy(user => user.Email).ToListAsync()) result.Add(await Describe(user));
        return Ok(result);
    }

    [HttpPost("users"), Authorize(Policy = "Admin")]
    public async Task<IActionResult> CreateUser(CreateUserRequest request)
    {
        if (!new[] { "Admin", "Analyst", "Viewer" }.Contains(request.Role)) return Problem(statusCode: 400, detail: "Choose Admin, Analyst or Viewer.");
        if (!await roles.RoleExistsAsync(request.Role)) return Problem(statusCode: 503, detail: "Run administrator bootstrap before creating users.");
        var user = new IdentityUser { Email = request.Email.Trim(), UserName = request.Email.Trim() };
        var result = await users.CreateAsync(user, request.Password);
        if (!result.Succeeded) return Problem(statusCode: 400, detail: string.Join(" ", result.Errors.Select(error => error.Description)));
        var roleResult = await users.AddToRoleAsync(user, request.Role);
        if (!roleResult.Succeeded)
        {
            await users.DeleteAsync(user);
            return Problem(statusCode: 500, detail: "Unable to assign the account role.");
        }
        return StatusCode(201, await Describe(user));
    }

    private async Task<object> Describe(IdentityUser user) => new { user.Id, user.Email, Roles = await users.GetRolesAsync(user) };
}
public record LoginRequest([Required, EmailAddress] string Email, [Required] string Password);
public record ChangePasswordRequest([Required] string CurrentPassword, [Required, MinLength(12)] string NewPassword);
public record CreateUserRequest([Required, EmailAddress] string Email, [Required, MinLength(12)] string Password, [Required] string Role);
