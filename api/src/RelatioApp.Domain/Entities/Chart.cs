using RelatioApp.Domain.Common;
using RelatioApp.Domain.Enums;

namespace RelatioApp.Domain.Entities;

/// <summary>A tree chart (organization chart or family tree) grouping its nodes.</summary>
public class Chart : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public ChartMode Mode { get; set; } = ChartMode.Org;

    /// <summary>
    /// Marker for auto-created reference charts (Org/Family examples). The
    /// client re-seeds any missing example on load so reference charts are
    /// always available — user charts are never treated as examples.
    /// </summary>
    public bool IsExample { get; set; }

    public List<TreeNode> Nodes { get; set; } = [];
}
