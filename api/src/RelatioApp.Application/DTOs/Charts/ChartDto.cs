namespace RelatioApp.Application.DTOs.Charts;

public class ChartDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid? ChartTypeId { get; set; }
    public bool IsExample { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<TreeNodeDto> Nodes { get; set; } = [];
}
