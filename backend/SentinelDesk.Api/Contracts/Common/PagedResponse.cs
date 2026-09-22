namespace SentinelDesk.Api.Contracts.Common;

/// <summary>Generic paginated response envelope returned by list endpoints.</summary>
/// <typeparam name="T">The item type.</typeparam>
public sealed class PagedResponse<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];

    public int Page { get; init; }

    public int PageSize { get; init; }

    public int TotalItems { get; init; }

    public int TotalPages { get; init; }
}
