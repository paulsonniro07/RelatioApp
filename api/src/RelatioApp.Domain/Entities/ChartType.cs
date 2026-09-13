using RelatioApp.Domain.Common;

namespace RelatioApp.Domain.Entities;

/// <summary>
/// A user-managed set of relationship types ("Family", "Organization", a custom
/// "Clan", …). Chart types are open-ended: users create, rename, duplicate and
/// delete them freely. The starter presets are ordinary rows, not special-cased.
/// </summary>
public class ChartType : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    /// <summary>Whether this chart type exposes the manual "Rank / tier" field + legend.</summary>
    public bool UsesLevels { get; set; }

    /// <summary>Marker for the seeded starter presets (kept available on first run).</summary>
    public bool IsExample { get; set; }

    public List<RelationshipTypeDefinition> Relationships { get; set; } = [];
}
