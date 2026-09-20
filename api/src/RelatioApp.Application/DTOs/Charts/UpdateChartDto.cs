namespace RelatioApp.Application.DTOs.Charts;

/// <summary>Partial update — omitted fields keep their current value.</summary>
public class UpdateChartDto
{
    public string? Name { get; set; }
    public Guid? ChartTypeId { get; set; }
    public string? SortKey { get; set; }
    public string? SortDir { get; set; }
}
