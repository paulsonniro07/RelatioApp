namespace RelatioApp.Application.DTOs.Charts;

public class CreateChartTypeDto
{
    public string Name { get; set; } = string.Empty;
    public bool IsExample { get; set; }
    public List<RelationshipTypeDefinitionDto> Relationships { get; set; } = [];
}
