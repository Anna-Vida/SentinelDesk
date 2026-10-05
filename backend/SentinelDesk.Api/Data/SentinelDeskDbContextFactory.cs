using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SentinelDesk.Api.Data;

public sealed class SentinelDeskDbContextFactory : IDesignTimeDbContextFactory<SentinelDeskDbContext>
{
    public SentinelDeskDbContext CreateDbContext(string[] args)
    {
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
                "Connection string 'DefaultConnection' not found.");

        var optionsBuilder = new DbContextOptionsBuilder<SentinelDeskDbContext>();

        if (connectionString.StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase))
            optionsBuilder.UseSqlite(connectionString);
        else
            optionsBuilder.UseNpgsql(connectionString);

        return new SentinelDeskDbContext(optionsBuilder.Options);
    }
}
