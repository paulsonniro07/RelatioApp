namespace RelatioApp.Application.DTOs.Charts;

/// <summary>Lightweight chart row for list/picker endpoints — no nodes.</summary>
public class ChartSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid? ChartTypeId { get; set; }
    public bool IsExample { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
