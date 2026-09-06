namespace RelatioApp.Application.DTOs.Charts;

public class ChartDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Mode { get; set; } = "org";
    public bool IsExample { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<TreeNodeDto> Nodes { get; set; } = [];
}
