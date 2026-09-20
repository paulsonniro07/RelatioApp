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
