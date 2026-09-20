namespace RelatioApp.Application.DTOs.Charts;

public class CreateChartDto
{
    public string Name { get; set; } = string.Empty;
    public Guid ChartTypeId { get; set; }
    public string? SortKey { get; set; }
    public string? SortDir { get; set; }
    public bool IsExample { get; set; }
}
