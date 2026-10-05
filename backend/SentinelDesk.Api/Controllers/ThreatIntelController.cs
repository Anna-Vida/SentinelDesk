using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace SentinelDesk.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/threat-intel")]
public sealed class ThreatIntelController(
    IHttpClientFactory httpClientFactory,
    IMemoryCache cache,
    ILogger<ThreatIntelController> logger) : ControllerBase
{
    private const string CacheKey = "cisa-kev-catalog";
    private const string FeedUrl =
        "https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json";
    private const string CatalogUrl =
        "https://www.cisa.gov/known-exploited-vulnerabilities-catalog";

    [HttpGet("cisa-kev")]
    public async Task<ActionResult<ThreatIntelResponse>> GetCisaKev(
        [FromQuery] string? search,
        [FromQuery] int limit = 75,
        [FromQuery] bool refresh = false,
        CancellationToken cancellationToken = default)
    {
        limit = Math.Clamp(limit, 1, 200);

        try
        {
            CisaKevCatalog catalog;

            if (!refresh && cache.TryGetValue<CisaKevCatalog>(CacheKey, out var cached) && cached is not null)
            {
                catalog = cached;
            }
            else
            {
                var client = httpClientFactory.CreateClient("CisaKev");
                catalog = await client.GetFromJsonAsync<CisaKevCatalog>(FeedUrl, cancellationToken)
                    ?? throw new InvalidOperationException("CISA KEV feed returned an empty response.");

                cache.Set(CacheKey, catalog, TimeSpan.FromMinutes(10));
            }

            IEnumerable<CisaKevEntry> items = catalog.Vulnerabilities;

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                items = items.Where(item =>
                    Contains(item.CveId, term) ||
                    Contains(item.VendorProject, term) ||
                    Contains(item.Product, term) ||
                    Contains(item.VulnerabilityName, term) ||
                    Contains(item.ShortDescription, term));
            }

            var ordered = items
                .OrderByDescending(item => item.DateAdded)
                .ThenBy(item => item.CveId)
                .Take(limit)
                .Select(item => new ThreatIntelItemResponse(
                    item.CveId,
                    item.VendorProject,
                    item.Product,
                    item.VulnerabilityName,
                    item.DateAdded,
                    item.ShortDescription,
                    item.RequiredAction,
                    item.DueDate,
                    item.KnownRansomwareCampaignUse,
                    item.Notes,
                    $"{CatalogUrl}?field_cve={Uri.EscapeDataString(item.CveId)}"))
                .ToList();

            var thirtyDaysAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));

            var addedLast30Days = catalog.Vulnerabilities.Count(item =>
                DateOnly.TryParse(item.DateAdded, out var date) && date >= thirtyDaysAgo);

            var ransomwareCount = catalog.Vulnerabilities.Count(item =>
                string.Equals(item.KnownRansomwareCampaignUse, "Known", StringComparison.OrdinalIgnoreCase));

            var latestDateAdded = catalog.Vulnerabilities
                .Select(item => item.DateAdded)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .OrderByDescending(value => value)
                .FirstOrDefault();

            return Ok(new ThreatIntelResponse(
                "CISA Known Exploited Vulnerabilities",
                CatalogUrl,
                catalog.CatalogVersion,
                catalog.DateReleased,
                catalog.Count,
                addedLast30Days,
                ransomwareCount,
                latestDateAdded,
                ordered));
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or InvalidOperationException)
        {
            logger.LogError(ex, "Unable to retrieve the CISA KEV threat intelligence feed");

            return StatusCode(StatusCodes.Status502BadGateway, new ProblemDetails
            {
                Title = "Threat intelligence source unavailable",
                Detail = "SentinelDesk could not retrieve the current CISA KEV catalog. Try refreshing again shortly.",
                Status = StatusCodes.Status502BadGateway,
                Instance = HttpContext.Request.Path
            });
        }
    }

    private static bool Contains(string? value, string search) =>
        !string.IsNullOrWhiteSpace(value) &&
        value.Contains(search, StringComparison.OrdinalIgnoreCase);

    private sealed class CisaKevCatalog
    {
        [JsonPropertyName("catalogVersion")]
        public string CatalogVersion { get; init; } = string.Empty;

        [JsonPropertyName("dateReleased")]
        public string DateReleased { get; init; } = string.Empty;

        [JsonPropertyName("count")]
        public int Count { get; init; }

        [JsonPropertyName("vulnerabilities")]
        public List<CisaKevEntry> Vulnerabilities { get; init; } = [];
    }

    private sealed class CisaKevEntry
    {
        [JsonPropertyName("cveID")]
        public string CveId { get; init; } = string.Empty;

        [JsonPropertyName("vendorProject")]
        public string VendorProject { get; init; } = string.Empty;

        [JsonPropertyName("product")]
        public string Product { get; init; } = string.Empty;

        [JsonPropertyName("vulnerabilityName")]
        public string VulnerabilityName { get; init; } = string.Empty;

        [JsonPropertyName("dateAdded")]
        public string DateAdded { get; init; } = string.Empty;

        [JsonPropertyName("shortDescription")]
        public string ShortDescription { get; init; } = string.Empty;

        [JsonPropertyName("requiredAction")]
        public string RequiredAction { get; init; } = string.Empty;

        [JsonPropertyName("dueDate")]
        public string DueDate { get; init; } = string.Empty;

        [JsonPropertyName("knownRansomwareCampaignUse")]
        public string KnownRansomwareCampaignUse { get; init; } = string.Empty;

        [JsonPropertyName("notes")]
        public string? Notes { get; init; }
    }
}

public sealed record ThreatIntelResponse(
    string Source,
    string SourceUrl,
    string CatalogVersion,
    string DateReleased,
    int TotalCount,
    int AddedLast30Days,
    int KnownRansomwareCount,
    string? LatestDateAdded,
    IReadOnlyList<ThreatIntelItemResponse> Items);

public sealed record ThreatIntelItemResponse(
    string CveId,
    string VendorProject,
    string Product,
    string VulnerabilityName,
    string DateAdded,
    string ShortDescription,
    string RequiredAction,
    string DueDate,
    string KnownRansomwareCampaignUse,
    string? Notes,
    string SourceUrl);
