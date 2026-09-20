using RelatioApp.Domain.Common;

namespace RelatioApp.Domain.Entities;

/// <summary>A relationship chart grouping its nodes, using a chart type's vocabulary.</summary>
public class Chart : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    /// <summary>The relationship vocabulary this chart uses. Null only for unmigrated rows.</summary>
    public Guid? ChartTypeId { get; set; }

    public ChartType? ChartType { get; set; }

    /// <summary>Sibling/root sort key applied by Auto layout: name | birthday | sequence | level.</summary>
    public string SortKey { get; set; } = "name";

    /// <summary>Sort direction: asc | desc.</summary>
    public string SortDir { get; set; } = "asc";

    /// <summary>
    /// Marker for auto-created reference charts (Org/Family examples). The
    /// client re-seeds any missing example on load so reference charts are
    /// always available — user charts are never treated as examples.
    /// </summary>
    public bool IsExample { get; set; }

    public List<TreeNode> Nodes { get; set; } = [];
}
