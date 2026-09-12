namespace RelatioApp.Application.DTOs.Charts;

/// <summary>One relationship type within a chart type's vocabulary.</summary>
public class RelationshipTypeDefinitionDto
{
    /// <summary>Stable slug unique within the chart type, e.g. "parent-child".</summary>
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string ForwardLabel { get; set; } = string.Empty;
    public string BackwardLabel { get; set; } = string.Empty;
    public string Icon { get; set; } = "user";
    public bool Directional { get; set; }

    /// <summary>parent | partner | shared-parent.</summary>
    public string Link { get; set; } = "parent";
}
