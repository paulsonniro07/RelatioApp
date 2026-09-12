using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.ChartTypes.Mappings;

/// <summary>Validates and maps relationship-type DTOs into chart type entities.</summary>
public static class ChartTypeRelationshipMapper
{
    private static readonly HashSet<string> AllowedLinks =
        new(StringComparer.OrdinalIgnoreCase) { "parent", "partner", "shared-parent" };

    public static List<RelationshipTypeDefinition> Build(
        IEnumerable<RelationshipTypeDefinitionDto> dtos)
    {
        var result = new List<RelationshipTypeDefinition>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var dto in dtos)
        {
            if (string.IsNullOrWhiteSpace(dto.Label))
            {
                throw ValidationErrors.Field("relationships", "Every relationship needs a label.");
            }

            var label = dto.Label.Trim();
            var id = string.IsNullOrWhiteSpace(dto.Id) ? Slugify(label) : dto.Id.Trim();
            if (!seen.Add(id))
            {
                throw ValidationErrors.Field("relationships", $"Duplicate relationship id '{id}'.");
            }

            var link = (dto.Link ?? string.Empty).Trim().ToLowerInvariant();
            if (!AllowedLinks.Contains(link)) link = "parent";

            result.Add(new RelationshipTypeDefinition
            {
                TypeId = id,
                Label = label,
                ForwardLabel = string.IsNullOrWhiteSpace(dto.ForwardLabel)
                    ? label
                    : dto.ForwardLabel.Trim(),
                BackwardLabel = string.IsNullOrWhiteSpace(dto.BackwardLabel)
                    ? label
                    : dto.BackwardLabel.Trim(),
                Icon = string.IsNullOrWhiteSpace(dto.Icon) ? "user" : dto.Icon.Trim(),
                Directional = dto.Directional,
                Link = link,
            });
        }

        return result;
    }

    /// <summary>Soft-deletes removed definitions and upserts the incoming set.</summary>
    public static void Apply(
        ChartType chartType,
        IEnumerable<RelationshipTypeDefinitionDto> dtos)
    {
        var definitions = Build(dtos);
        var incomingIds = definitions
            .Select(d => d.TypeId)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var existing in chartType.Relationships.Where(r => !r.IsDeleted).ToList())
        {
            if (!incomingIds.Contains(existing.TypeId))
            {
                existing.IsDeleted = true;
                existing.UpdatedAt = DateTime.UtcNow;
            }
        }

        foreach (var def in definitions)
        {
            var existing = chartType.Relationships.FirstOrDefault(
                r => !r.IsDeleted && string.Equals(r.TypeId, def.TypeId, StringComparison.OrdinalIgnoreCase));

            if (existing is null)
            {
                chartType.Relationships.Add(def);
            }
            else
            {
                existing.Label = def.Label;
                existing.ForwardLabel = def.ForwardLabel;
                existing.BackwardLabel = def.BackwardLabel;
                existing.Icon = def.Icon;
                existing.Directional = def.Directional;
                existing.Link = def.Link;
                existing.UpdatedAt = DateTime.UtcNow;
            }
        }
    }

    private static string Slugify(string label)
    {
        var slug = new string(
            label.Trim().ToLowerInvariant()
                .Select(c => char.IsLetterOrDigit(c) ? c : '-')
                .ToArray());
        while (slug.Contains("--")) slug = slug.Replace("--", "-");
        slug = slug.Trim('-');
        return string.IsNullOrEmpty(slug) ? "relationship" : slug;
    }
}
