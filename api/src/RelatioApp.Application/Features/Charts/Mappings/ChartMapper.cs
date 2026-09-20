using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.Charts.Mappings;

public static class ChartMapper
{
    private static readonly HashSet<string> SortKeys =
        new(StringComparer.OrdinalIgnoreCase) { "name", "birthday", "sequence", "level" };

    public static string NormalizeSortKey(string? key)
        => key is not null && SortKeys.Contains(key.Trim()) ? key.Trim().ToLowerInvariant() : "name";

    public static string NormalizeSortDir(string? dir)
        => string.Equals(dir?.Trim(), "desc", StringComparison.OrdinalIgnoreCase) ? "desc" : "asc";

    public static TreeNodeDto ToDto(TreeNode node) => new()
    {
        Id = node.Id,
        ChartId = node.ChartId,
        Name = node.Name,
        ParentId = node.ParentId,
        PartnerId = node.PartnerId,
        Level = node.Level,
        Role = node.RoleOrRelationship,
        RelationshipTypeId = node.RelationshipTypeId,
        LinkedNodeRef =
            node.LinkedChartId is Guid linkedChartId && node.LinkedNodeId is Guid linkedNodeId
                ? new LinkedNodeRefDto { ChartId = linkedChartId, NodeId = linkedNodeId }
                : null,
        BirthDate = node.BirthDate,
        Sequence = node.Sequence,
        Notes = node.Notes,
        PhotoUrl = node.PhotoUrl,
        PositionX = node.PositionX,
        PositionY = node.PositionY,
        CreatedAt = node.CreatedAt,
        UpdatedAt = node.UpdatedAt,
    };

    public static ChartDto ToDto(Chart chart) => new()
    {
        Id = chart.Id,
        Name = chart.Name,
        ChartTypeId = chart.ChartTypeId,
        SortKey = chart.SortKey,
        SortDir = chart.SortDir,
        IsExample = chart.IsExample,
        CreatedAt = chart.CreatedAt,
        UpdatedAt = chart.UpdatedAt,
        Nodes = chart.Nodes.Select(ToDto).ToList(),
    };

    public static ChartSummaryDto ToSummaryDto(Chart chart) => new()
    {
        Id = chart.Id,
        Name = chart.Name,
        ChartTypeId = chart.ChartTypeId,
        SortKey = chart.SortKey,
        SortDir = chart.SortDir,
        IsExample = chart.IsExample,
        CreatedAt = chart.CreatedAt,
        UpdatedAt = chart.UpdatedAt,
    };

    public static RelationshipTypeDefinitionDto ToDto(RelationshipTypeDefinition definition) => new()
    {
        Id = definition.TypeId,
        Label = definition.Label,
        ForwardLabel = definition.ForwardLabel,
        BackwardLabel = definition.BackwardLabel,
        Icon = definition.Icon,
        Directional = definition.Directional,
        Link = definition.Link,
    };

    public static ChartTypeDto ToDto(ChartType chartType) => new()
    {
        Id = chartType.Id,
        Name = chartType.Name,
        UsesLevels = chartType.UsesLevels,
        IsExample = chartType.IsExample,
        CreatedAt = chartType.CreatedAt,
        UpdatedAt = chartType.UpdatedAt,
        Relationships = chartType.Relationships
            .Where(r => !r.IsDeleted)
            .Select(ToDto)
            .ToList(),
    };
}
