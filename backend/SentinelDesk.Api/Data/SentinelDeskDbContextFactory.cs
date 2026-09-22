using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SentinelDesk.Api.Data;

/// <summary>
/// Design-time factory used by EF Core CLI tools (dotnet ef migrations add, dotnet ef database update, etc.).
/// Reads the real connection string from user-secrets / appsettings / environment variables so that
/// both migration scaffolding and database updates work without hardcoded credentials.
/// </summary>
public sealed class SentinelDeskDbContextFactory : IDesignTimeDbContextFactory<SentinelDeskDbContext>
{
    public SentinelDeskDbContext CreateDbContext(string[] args)
    {
        // Build the same configuration stack that the app uses at runtime,
        // so dotnet-ef picks up the connection string stored in user-secrets.
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddUserSecrets<SentinelDeskDbContextFactory>()
            .AddEnvironmentVariables()
            .Build();

        var connectionString =
            configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "Connection string 'DefaultConnection' not found. " +
                "Run: dotnet user-secrets set \"ConnectionStrings:DefaultConnection\" \"<your-connection-string>\"");

        var options = new DbContextOptionsBuilder<SentinelDeskDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new SentinelDeskDbContext(options);
    }
}
