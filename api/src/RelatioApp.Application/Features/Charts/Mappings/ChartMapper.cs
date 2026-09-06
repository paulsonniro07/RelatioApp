using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Domain.Entities;
using RelatioApp.Domain.Enums;

namespace RelatioApp.Application.Features.Charts.Mappings;

public static class ChartMapper
{
    public static TreeNodeDto ToDto(TreeNode node) => new()
    {
        Id = node.Id,
        ChartId = node.ChartId,
        Name = node.Name,
        ParentId = node.ParentId,
        PartnerId = node.PartnerId,
        Level = node.Level,
        Role = node.RoleOrRelationship,
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
        Mode = ModeToString(chart.Mode),
        IsExample = chart.IsExample,
        CreatedAt = chart.CreatedAt,
        UpdatedAt = chart.UpdatedAt,
        Nodes = chart.Nodes.Select(ToDto).ToList(),
    };

    public static ChartSummaryDto ToSummaryDto(Chart chart) => new()
    {
        Id = chart.Id,
        Name = chart.Name,
        Mode = ModeToString(chart.Mode),
        IsExample = chart.IsExample,
        CreatedAt = chart.CreatedAt,
        UpdatedAt = chart.UpdatedAt,
    };

    public static string ModeToString(ChartMode mode) => mode.ToString().ToLowerInvariant();

    public static bool TryParseMode(string? mode, out ChartMode result)
        => Enum.TryParse(mode, ignoreCase: true, out result);
}
