namespace RelatioApp.Application.DTOs.Charts;

public class UpdateNodeDto
{
    public string Name { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
}
