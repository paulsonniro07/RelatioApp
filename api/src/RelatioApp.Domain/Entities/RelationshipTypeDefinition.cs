using RelatioApp.Domain.Common;

namespace RelatioApp.Domain.Entities;

/// <summary>
/// One relationship type within a <see cref="ChartType"/> — the configurable
/// replacement for the old hardcoded Parent/Child/Spouse/Sibling vocabulary.
/// </summary>
public class RelationshipTypeDefinition : BaseEntity
{
    public Guid ChartTypeId { get; set; }

    public ChartType ChartType { get; set; } = null!;

    /// <summary>Stable slug, unique within the chart type, e.g. "parent-child".</summary>
    public string TypeId { get; set; } = string.Empty;

    /// <summary>Dropdown group label, e.g. "Parent / Child".</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>Label shown on the "from" side, e.g. "Parent".</summary>
    public string ForwardLabel { get; set; } = string.Empty;

    /// <summary>Label shown on the "to" side, e.g. "Child".</summary>
    public string BackwardLabel { get; set; } = string.Empty;

    public string Icon { get; set; } = "user";

    /// <summary>true = hierarchical (drives computed depth/layout).</summary>
    public bool Directional { get; set; }

    /// <summary>How the relationship wires nodes: parent | partner | shared-parent.</summary>
    public string Link { get; set; } = "parent";
}
