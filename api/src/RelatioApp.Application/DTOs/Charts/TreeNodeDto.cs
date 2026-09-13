namespace RelatioApp.Application.DTOs.Charts;

public class TreeNodeDto
{
    public Guid Id { get; set; }
    public Guid ChartId { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }
    public Guid? PartnerId { get; set; }
    public string Level { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? RelationshipTypeId { get; set; }
    public LinkedNodeRefDto? LinkedNodeRef { get; set; }
    public string Notes { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public double PositionX { get; set; }
    public double PositionY { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
