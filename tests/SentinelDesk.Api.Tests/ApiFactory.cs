using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SentinelDesk.Api.Data;

namespace SentinelDesk.Api.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    public string? Postgres => Environment.GetEnvironmentVariable("TEST_DATABASE_URL");
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = Postgres ?? "Host=unused;Database=tests",
            ["Auth:BootstrapAdmin"] = "false", ["Database:MigrateOnStartup"] = "false"
        }));
        if (Postgres is null) builder.ConfigureServices(services =>
        {
            connection.Open();
            services.RemoveAll<DbContextOptions<SentinelDeskDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<SentinelDeskDbContext>>();
            services.AddDbContext<SentinelDeskDbContext>(options => options.UseSqlite(connection));
        });
    }
    public async Task InitializeAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SentinelDeskDbContext>();
        if (Postgres is null) await db.Database.EnsureCreatedAsync();
        else await db.Database.MigrateAsync();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var role in new[] { "Admin", "Analyst", "Viewer" })
        {
            if (!await roles.RoleExistsAsync(role)) await roles.CreateAsync(new IdentityRole(role));
            var email = $"{role.ToLowerInvariant()}@example.test";
            if (await users.FindByEmailAsync(email) is not null) continue;
            var user = new IdentityUser { UserName = email, Email = email };
            var result = await users.CreateAsync(user, "Test-Only-Password123!");
            if (!result.Succeeded) throw new Exception(string.Join(",", result.Errors.Select(e => e.Description)));
            await users.AddToRoleAsync(user, role);
        }
    }
    protected override void Dispose(bool disposing) { base.Dispose(disposing); if (disposing) connection.Dispose(); }
}
