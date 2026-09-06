using RelatioApp.Domain.Common;

namespace RelatioApp.Domain.Entities;

/// <summary>
/// A node in a relationship graph. Parent/child links form the tree;
/// PartnerId is the optional spouse/partner link (family mode only).
/// </summary>
public class TreeNode : BaseEntity
{
    public Guid ChartId { get; set; }

    public Chart Chart { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    /// <summary>null = root node.</summary>
    public Guid? ParentId { get; set; }

    public TreeNode? Parent { get; set; }

    /// <summary>Optional spouse/partner link — used in family mode, ignored in org mode.</summary>
    public Guid? PartnerId { get; set; }

    public TreeNode? Partner { get; set; }

    /// <summary>Manual level/title label, e.g. "CEO", "Director", "Grandparent".</summary>
    public string Level { get; set; } = string.Empty;

    /// <summary>Role / relationship label, e.g. "VP Engineering", "Parent".</summary>
    public string RoleOrRelationship { get; set; } = string.Empty;

    public string Notes { get; set; } = string.Empty;

    public string? PhotoUrl { get; set; }

    public double PositionX { get; set; }

    public double PositionY { get; set; }

    public List<TreeNode> Children { get; set; } = [];
}
