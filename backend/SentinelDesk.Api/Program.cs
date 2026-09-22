using Microsoft.EntityFrameworkCore;
using SentinelDesk.Api.Data;
using SentinelDesk.Api.Hubs;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

const string DevelopmentCorsPolicy = "DevelopmentCors";

// Centralised Problem Details responses (RFC 7807) — no stack traces exposed.
builder.Services.AddProblemDetails();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Return and accept enums as strings ("High", "Open") instead of integers.
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddSignalR();

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(options =>
    {
        options.AddPolicy(DevelopmentCorsPolicy, policy =>
        {
            policy.WithOrigins("http://localhost:5173")
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
    app.UseCors(DevelopmentCorsPolicy);
}

// Turns unhandled exceptions into Problem Details responses.
app.UseExceptionHandler();
// Turns bare 4xx/5xx status codes into Problem Details.
app.UseStatusCodePages();

app.UseAuthorization();

app.MapControllers();
app.MapHub<SecurityHub>("/hubs/security");

app.Run();

public partial class Program { }
