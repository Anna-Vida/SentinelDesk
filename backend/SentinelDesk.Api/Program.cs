using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SentinelDesk.Api.Data;
using SentinelDesk.Api.Hubs;
using SentinelDesk.Api.Models;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

var deploymentPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(deploymentPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{deploymentPort}");
}

const string ApplicationCorsPolicy = "ApplicationCors";

builder.Services.AddProblemDetails();
builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddSignalR();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient("CisaKev", client =>
{
    client.Timeout = TimeSpan.FromSeconds(20);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("SentinelDesk/1.0");
});

var configuredOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? string.Empty)
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
var allowedOrigins = builder.Environment.IsDevelopment()
    ? configuredOrigins.Append("http://localhost:5173").Distinct(StringComparer.OrdinalIgnoreCase).ToArray()
    : configuredOrigins;

if (allowedOrigins.Length > 0)
{
    builder.Services.AddCors(options => options.AddPolicy(ApplicationCorsPolicy, policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
}

builder.Services.AddOpenApi();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");

builder.Services.AddDbContext<SentinelDeskDbContext>(options =>
{
    if (connectionString.StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase))
        options.UseSqlite(connectionString);
    else
        options.UseNpgsql(connectionString);
});

builder.Services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT signing key is not configured.");
if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("JWT signing key must be at least 32 bytes.");

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "SentinelDesk";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "SentinelDesk.Web";
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = ClaimTypes.Name,
            RoleClaimType = ClaimTypes.Role
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) &&
                    context.HttpContext.Request.Path.StartsWithSegments("/hubs/security"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var database = scope.ServiceProvider.GetRequiredService<SentinelDeskDbContext>();

    if (database.Database.IsSqlite())
    {
        await database.Database.EnsureCreatedAsync();
        await database.Database.OpenConnectionAsync();

        try
        {
            await using var command = database.Database.GetDbConnection().CreateCommand();
            command.CommandText = "SELECT COUNT(*) FROM pragma_table_info('Users') WHERE name = 'IsApproved';";
            var hasApprovalColumn = Convert.ToInt32(await command.ExecuteScalarAsync()) > 0;

            if (!hasApprovalColumn)
            {
                command.CommandText = "ALTER TABLE Users ADD COLUMN IsApproved INTEGER NOT NULL DEFAULT 1;";
                await command.ExecuteNonQueryAsync();
            }

            command.CommandText = """
                CREATE TABLE IF NOT EXISTS Endpoints (
                    Id TEXT NOT NULL PRIMARY KEY,
                    ComputerName TEXT NOT NULL,
                    OsName TEXT NULL,
                    OsVersion TEXT NULL,
                    AgentVersion TEXT NULL,
                    LastIpAddress TEXT NULL,
                    IsEnabled INTEGER NOT NULL DEFAULT 1,
                    FirstSeenAt TEXT NOT NULL,
                    LastSeenAt TEXT NOT NULL,
                    LastEventAt TEXT NULL
                );
                """;
            await command.ExecuteNonQueryAsync();

            command.CommandText = "CREATE UNIQUE INDEX IF NOT EXISTS IX_Endpoints_ComputerName ON Endpoints (ComputerName);";
            await command.ExecuteNonQueryAsync();

            command.CommandText = "CREATE INDEX IF NOT EXISTS IX_Endpoints_LastSeenAt ON Endpoints (LastSeenAt);";
            await command.ExecuteNonQueryAsync();

            command.CommandText = "SELECT COUNT(*) FROM pragma_table_info('SecurityEvents') WHERE name = 'EndpointId';";
            var hasSecurityEventEndpointColumn = Convert.ToInt32(await command.ExecuteScalarAsync()) > 0;

            if (!hasSecurityEventEndpointColumn)
            {
                command.CommandText = "ALTER TABLE SecurityEvents ADD COLUMN EndpointId TEXT NULL;";
                await command.ExecuteNonQueryAsync();
            }

            command.CommandText = "CREATE INDEX IF NOT EXISTS IX_SecurityEvents_EndpointId ON SecurityEvents (EndpointId);";
            await command.ExecuteNonQueryAsync();

            command.CommandText = "SELECT COUNT(*) FROM pragma_table_info('Incidents') WHERE name = 'EndpointId';";
            var hasIncidentEndpointColumn = Convert.ToInt32(await command.ExecuteScalarAsync()) > 0;

            if (!hasIncidentEndpointColumn)
            {
                command.CommandText = "ALTER TABLE Incidents ADD COLUMN EndpointId TEXT NULL;";
                await command.ExecuteNonQueryAsync();
            }

            command.CommandText = "CREATE INDEX IF NOT EXISTS IX_Incidents_EndpointId ON Incidents (EndpointId);";
            await command.ExecuteNonQueryAsync();

            command.CommandText = """
                CREATE TABLE IF NOT EXISTS DetectionRules (
                    Id TEXT NOT NULL PRIMARY KEY,
                    RuleKey TEXT NOT NULL,
                    Name TEXT NOT NULL,
                    Description TEXT NOT NULL,
                    IsEnabled INTEGER NOT NULL DEFAULT 1,
                    Severity TEXT NOT NULL,
                    TriggerCount INTEGER NOT NULL,
                    WindowMinutes INTEGER NOT NULL,
                    RiskScore INTEGER NOT NULL,
                    MatchPatterns TEXT NOT NULL,
                    UpdatedAt TEXT NOT NULL
                );
                """;
            await command.ExecuteNonQueryAsync();

            command.CommandText = "CREATE UNIQUE INDEX IF NOT EXISTS IX_DetectionRules_RuleKey ON DetectionRules (RuleKey);";
            await command.ExecuteNonQueryAsync();

            command.CommandText = "SELECT COUNT(*) FROM pragma_table_info('Incidents') WHERE name = 'AssignedToUserId';";
            var hasAssignedUserColumn = Convert.ToInt32(await command.ExecuteScalarAsync()) > 0;
            if (!hasAssignedUserColumn)
            {
                command.CommandText = "ALTER TABLE Incidents ADD COLUMN AssignedToUserId TEXT NULL;";
                await command.ExecuteNonQueryAsync();
            }

            command.CommandText = "SELECT COUNT(*) FROM pragma_table_info('Incidents') WHERE name = 'AssignedToDisplayName';";
            var hasAssignedNameColumn = Convert.ToInt32(await command.ExecuteScalarAsync()) > 0;
            if (!hasAssignedNameColumn)
            {
                command.CommandText = "ALTER TABLE Incidents ADD COLUMN AssignedToDisplayName TEXT NULL;";
                await command.ExecuteNonQueryAsync();
            }

            command.CommandText = "CREATE INDEX IF NOT EXISTS IX_Incidents_AssignedToUserId ON Incidents (AssignedToUserId);";
            await command.ExecuteNonQueryAsync();

            command.CommandText = """
                CREATE TABLE IF NOT EXISTS IncidentActivities (
                    Id TEXT NOT NULL PRIMARY KEY,
                    IncidentId TEXT NOT NULL,
                    ActivityType TEXT NOT NULL,
                    Message TEXT NOT NULL,
                    ActorUserId TEXT NULL,
                    ActorDisplayName TEXT NOT NULL,
                    CreatedAt TEXT NOT NULL,
                    FOREIGN KEY (IncidentId) REFERENCES Incidents (Id) ON DELETE CASCADE
                );
                """;
            await command.ExecuteNonQueryAsync();

            command.CommandText = "CREATE INDEX IF NOT EXISTS IX_IncidentActivities_IncidentId ON IncidentActivities (IncidentId);";
            await command.ExecuteNonQueryAsync();
            command.CommandText = "CREATE INDEX IF NOT EXISTS IX_IncidentActivities_CreatedAt ON IncidentActivities (CreatedAt);";
            await command.ExecuteNonQueryAsync();
        }
        finally
        {
            await database.Database.CloseConnectionAsync();
        }
    }
    else
    {
        await database.Database.MigrateAsync();
    }

    if (!await database.DetectionRules.AnyAsync())
    {
        var now = DateTime.UtcNow;
        database.DetectionRules.AddRange(
            new DetectionRule
            {
                Id = Guid.NewGuid(),
                RuleKey = DetectionRuleKeys.FailedLogonBurst,
                Name = "Repeated failed logons",
                Description = "Creates an incident when multiple Windows failed-logon events arrive from the same source.",
                IsEnabled = true,
                Severity = IncidentSeverity.High,
                TriggerCount = 5,
                WindowMinutes = 5,
                RiskScore = 55,
                MatchPatterns = string.Empty,
                UpdatedAt = now
            },
            new DetectionRule
            {
                Id = Guid.NewGuid(),
                RuleKey = DetectionRuleKeys.SuspiciousPowerShell,
                Name = "Suspicious PowerShell",
                Description = "Detects high-risk PowerShell script-block content using configurable command patterns.",
                IsEnabled = true,
                Severity = IncidentSeverity.Critical,
                TriggerCount = 1,
                WindowMinutes = 5,
                RiskScore = 92,
                MatchPatterns = "-encodedcommand\nfrombase64string\ndownloadstring\ninvoke-expression\ninvoke-webrequest\niex \niwr \ncertutil\nbitsadmin",
                UpdatedAt = now
            },
            new DetectionRule
            {
                Id = Guid.NewGuid(),
                RuleKey = DetectionRuleKeys.SuspiciousProcess,
                Name = "Suspicious process execution",
                Description = "Detects Windows process-creation command lines matching configurable high-risk patterns.",
                IsEnabled = true,
                Severity = IncidentSeverity.High,
                TriggerCount = 1,
                WindowMinutes = 5,
                RiskScore = 88,
                MatchPatterns = "powershell.exe -enc\npowershell.exe -encodedcommand\npwsh.exe -enc\ncertutil -urlcache\nbitsadmin /transfer\nrundll32 javascript:\nregsvr32 /s /n /u /i:",
                UpdatedAt = now
            });
        await database.SaveChangesAsync();
    }
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

if (allowedOrigins.Length > 0)
    app.UseCors(ApplicationCorsPolicy);

app.UseExceptionHandler();
app.UseStatusCodePages();

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<SecurityHub>("/hubs/security");
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program { }
