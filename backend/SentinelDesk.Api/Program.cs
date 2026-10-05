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
