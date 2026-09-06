namespace RelatioApp.Application.Common;

public class PaginationFilter
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? SearchKeyword { get; set; }
    public string? SortBy { get; set; }
    public string SortDirection { get; set; } = "asc";

    public int GetSafePageNumber() => Math.Max(1, PageNumber);

    public int GetSafePageSize(int max = 100) => Math.Clamp(PageSize, 1, max);

    public bool IsDescending => string.Equals(SortDirection, "desc", StringComparison.OrdinalIgnoreCase);
}
