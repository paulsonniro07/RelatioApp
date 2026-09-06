namespace RelatioApp.Application.Common;

public class PaginatedList<T>
{
    public List<T> Data { get; set; } = [];
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }

    public static PaginatedList<T> Create(
        IReadOnlyList<T> data,
        int totalCount,
        int pageNumber,
        int pageSize) => new()
        {
            Data = [.. data],
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)Math.Max(1, pageSize)),
        };

    public static PaginatedList<T> Empty(int pageNumber = 1, int pageSize = 10)
        => Create([], 0, pageNumber, pageSize);
}
