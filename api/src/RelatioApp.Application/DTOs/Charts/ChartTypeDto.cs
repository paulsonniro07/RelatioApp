namespace RelatioApp.Application.DTOs.Charts;

/// <summary>A user-managed set of relationship types (relationship vocabulary).</summary>
public class ChartTypeDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool UsesLevels { get; set; }
    public bool IsExample { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<RelationshipTypeDefinitionDto> Relationships { get; set; } = [];
}
