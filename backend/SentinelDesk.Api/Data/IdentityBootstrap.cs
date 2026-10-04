using Microsoft.AspNetCore.Identity;
namespace SentinelDesk.Api.Data;

public static class IdentityBootstrap
{
    public static async Task InitializeAsync(IServiceProvider services, IConfiguration configuration)
    {
        var users = services.GetRequiredService<UserManager<IdentityUser>>();
        var roles = services.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var role in new[] { "Admin", "Analyst", "Viewer" })
            if (!await roles.RoleExistsAsync(role)) Ensure(await roles.CreateAsync(new IdentityRole(role)));
        // Bootstrap only an empty identity store; never reset an existing user's password or role.
        if (users.Users.Any()) return;
        var email = configuration["Auth:AdminEmail"] ?? throw new InvalidOperationException("Auth:AdminEmail is required for bootstrap.");
        var password = configuration["Auth:AdminPassword"] ?? throw new InvalidOperationException("Auth:AdminPassword is required for bootstrap.");
        var user = new IdentityUser { UserName = email, Email = email };
        Ensure(await users.CreateAsync(user, password));
        Ensure(await users.AddToRoleAsync(user, "Admin"));
    }
    private static void Ensure(IdentityResult result)
    {
        if (!result.Succeeded) throw new InvalidOperationException(string.Join(" ", result.Errors.Select(error => error.Description)));
    }
}
