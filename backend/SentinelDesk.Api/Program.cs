using Microsoft.EntityFrameworkCore;
using SentinelDesk.Api.Data;
using SentinelDesk.Api.Hubs;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

const string ApplicationCorsPolicy = "ApplicationCors";

builder.Services.AddProblemDetails();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddSignalR();

var configuredOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? string.Empty)
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

var allowedOrigins = builder.Environment.IsDevelopment()
    ? configuredOrigins.Append("http://localhost:5173").Distinct(StringComparer.OrdinalIgnoreCase).ToArray()
    : configuredOrigins;

if (allowedOrigins.Length > 0)
{
    builder.Services.AddCors(options =>
    {
        options.AddPolicy(ApplicationCorsPolicy, policy =>
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
    });
}

builder.Services.AddOpenApi();

builder.Services.AddDbContext<SentinelDeskDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.")));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (allowedOrigins.Length > 0)
{
    app.UseCors(ApplicationCorsPolicy);
}

app.UseExceptionHandler();
app.UseStatusCodePages();

app.UseAuthorization();

app.MapControllers();
app.MapHub<SecurityHub>("/hubs/security");

app.Run();

public partial class Program { }
