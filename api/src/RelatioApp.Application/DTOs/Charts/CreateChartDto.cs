namespace RelatioApp.Application.DTOs.Charts;

public class CreateChartDto
{
    public string Name { get; set; } = string.Empty;
    public string Mode { get; set; } = "org";
    public bool IsExample { get; set; }
}
