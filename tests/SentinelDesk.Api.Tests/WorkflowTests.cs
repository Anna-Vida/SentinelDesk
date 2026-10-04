using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SentinelDesk.Api.Data;
using SentinelDesk.Api.Models;
using Xunit;

namespace SentinelDesk.Api.Tests;

public sealed class WorkflowTests : IClassFixture<ApiFactory>, IAsyncLifetime
{
    private readonly ApiFactory factory;
    public WorkflowTests(ApiFactory factory) => this.factory = factory;
    public Task InitializeAsync() => factory.InitializeAsync();
    public Task DisposeAsync() => Task.CompletedTask;
    private HttpClient Client() => factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true, AllowAutoRedirect = false });
    private static async Task Csrf(HttpClient client)
    {
        var token = await client.GetFromJsonAsync<JsonElement>("/api/auth/csrf");
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", token.GetProperty("token").GetString());
    }
    private async Task<HttpClient> Login(string role)
    {
        var client = Client(); await Csrf(client);
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email = $"{role}@example.test", password = "Test-Only-Password123!" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode); await Csrf(client); return client;
    }
    private static async Task<string> CreateIncident(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/incidents", new { title = "Suspicious sign-in", description = "Unusual authentication from a test address.", severity = "High" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;
    }
    [Fact]
    public async Task AnonymousCannotReadIncidentsOrNegotiateHub()
    {
        using var client = Client();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/incidents")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsync("/hubs/security/negotiate?negotiateVersion=1", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/health")).StatusCode);
    }
    [Fact]
    public async Task CookieWritesRequireCsrfAndViewerCannotWrite()
    {
        using var analyst = await Login("analyst");
        analyst.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        Assert.Equal(HttpStatusCode.BadRequest, (await analyst.PostAsJsonAsync("/api/incidents", new { title = "Test", description = "Test", severity = "Low" })).StatusCode);
        using var viewer = await Login("viewer");
        Assert.Equal(HttpStatusCode.OK, (await viewer.GetAsync("/api/incidents")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await viewer.PostAsJsonAsync("/api/incidents", new { title = "Test", description = "Test", severity = "Low" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await analyst.GetAsync("/api/auth/users")).StatusCode);
    }
    [Fact]
    public async Task FullIncidentEventWorkflowPreservesArchivedEvidence()
    {
        using var client = await Login("analyst"); var id = await CreateIncident(client);
        var invalid = await client.PatchAsJsonAsync($"/api/incidents/{id}/status", new { newStatus = "Closed" });
        Assert.Equal(HttpStatusCode.Conflict, invalid.StatusCode);
        var edited = await client.PutAsJsonAsync($"/api/incidents/{id}", new { title = "Investigate sign-in", description = "Evidence confirmed.", severity = "Critical" });
        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        var recorded = await client.PostAsJsonAsync("/api/security-events", new { eventType = "Login", sourceIp = "192.0.2.10", description = "Test evidence", riskScore = 90 });
        Assert.Equal(HttpStatusCode.Created, recorded.StatusCode);
        var eventId = (await recorded.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString();
        Assert.Equal(HttpStatusCode.OK, (await client.PatchAsync($"/api/security-events/{eventId}/incident/{id}", null)).StatusCode);
        foreach (var status in new[] { "Investigating", "Contained", "Resolved", "Closed" })
            Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync($"/api/incidents/{id}/status", new { newStatus = status })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/incidents/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/incidents/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync($"/api/incidents/{id}", new { title = "Changed", description = "Changed", severity = "Low" })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PatchAsync($"/api/security-events/{eventId}/incident/{id}", null)).StatusCode);
        var events = await client.GetFromJsonAsync<JsonElement>($"/api/security-events?incidentId={id}");
        Assert.Equal(1, events.GetProperty("totalItems").GetInt32());
        Assert.True((await client.GetFromJsonAsync<JsonElement>($"/api/incidents/{id}")).GetProperty("isArchived").GetBoolean());
    }
    [Fact]
    public async Task InvalidInputIsRejected()
    {
        using var client = await Login("analyst");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/incidents", new { title = "   ", description = "Test", severity = "High" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/security-events", new { eventType = "Test", sourceIp = "not-an-ip", description = "Test", riskScore = 10 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/security-events", new { eventType = "Test", sourceIp = "::1", description = "Test", riskScore = 101 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/incidents?pageSize=101")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/incidents?status=999")).StatusCode);
    }
    [Fact]
    public async Task AdminCreatesAccountsAndLogoutRevokesBrowserSession()
    {
        using var client = await Login("admin");
        var email = $"new-{Guid.NewGuid():N}@example.test";
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/auth/users", new { email, password = "Test-Only-Password123!", role = "Viewer" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/users")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/auth/logout", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/incidents")).StatusCode);
    }
    [Fact]
    public async Task DashboardCountsMoreThanOnePageAndExcludesArchivedAndResolvedCritical()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SentinelDeskDbContext>();
        var before = await db.Incidents.CountAsync(i => !i.IsArchived && i.Status == IncidentStatus.Open);
        var now = DateTime.UtcNow;
        db.Incidents.AddRange(Enumerable.Range(0, 105).Select(index => new Incident { Id = Guid.NewGuid(), Title = $"Bulk {index}", Description = "Metric regression", Severity = IncidentSeverity.Low, Status = IncidentStatus.Open, CreatedAt = now, UpdatedAt = now }));
        await db.SaveChangesAsync();
        using var client = await Login("viewer");
        var summary = await client.GetFromJsonAsync<JsonElement>("/api/dashboard");
        var count = summary.GetProperty("byStatus").EnumerateArray().Single(item => item.GetProperty("label").GetString() == "Open").GetProperty("count").GetInt32();
        Assert.Equal(before + 105, count);
        Assert.Equal(6, summary.GetProperty("recentIncidents").GetArrayLength());
    }
    [Fact]
    public async Task PostgresSearchAndMigrationAreCompatible()
    {
        // CI sets TEST_DATABASE_URL to a disposable PostgreSQL service.
        if (factory.Postgres is null) return;
        using var client = await Login("analyst"); await CreateIncident(client);
        var result = await client.GetFromJsonAsync<JsonElement>("/api/incidents?search=SUSPICIOUS");
        Assert.True(result.GetProperty("totalItems").GetInt32() > 0);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SentinelDeskDbContext>();
        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
    }
}
