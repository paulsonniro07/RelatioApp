namespace RelatioApp.Application.DTOs.Charts;

/// <summary>A navigation-only reference to a node in another chart.</summary>
public class LinkedNodeRefDto
{
    public Guid ChartId { get; set; }
    public Guid NodeId { get; set; }
}
