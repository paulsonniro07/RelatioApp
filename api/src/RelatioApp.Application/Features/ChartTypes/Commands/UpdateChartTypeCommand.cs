using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.ChartTypes.Mappings;
using RelatioApp.Application.Features.Charts.Mappings;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.ChartTypes.Commands;

public record UpdateChartTypeCommand(Guid ChartTypeId, UpdateChartTypeDto Input)
    : IRequest<ChartTypeDto>;

public class UpdateChartTypeHandler : IRequestHandler<UpdateChartTypeCommand, ChartTypeDto>
{
    private readonly IChartTypeRepository _repository;

    public UpdateChartTypeHandler(IChartTypeRepository repository) => _repository = repository;

    public async Task<ChartTypeDto> Handle(UpdateChartTypeCommand request, CancellationToken ct)
    {
        var chartType = await _repository.GetByIdWithRelationshipsAsync(request.ChartTypeId, ct)
            ?? throw new NotFoundException(nameof(ChartType), request.ChartTypeId);

        var name = request.Input.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(name))
        {
            throw ValidationErrors.Field("name", "Name is required.");
        }

        if (await _repository.ExistsByNameAsync(name, excludeId: request.ChartTypeId, ct: ct))
        {
            throw new ConflictException($"A chart type named '{name}' already exists.");
        }

        chartType.Name = name;
        chartType.UsesLevels = request.Input.UsesLevels;
        if (request.Input.IsExample.HasValue)
        {
            chartType.IsExample = request.Input.IsExample.Value;
        }

        // Reconcile the relationship set: soft-delete removed ones, update
        // matched ones, and explicitly track new ones as Added (adding to the
        // loaded navigation alone can be tracked as Modified and fail the insert).
        var definitions = ChartTypeRelationshipMapper.Build(request.Input.Relationships);
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
                r => !r.IsDeleted &&
                     string.Equals(r.TypeId, def.TypeId, StringComparison.OrdinalIgnoreCase));

            if (existing is null)
            {
                def.ChartTypeId = chartType.Id;
                _repository.AddRelationship(def);
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

        await _repository.SaveChangesAsync(ct);
        return ChartMapper.ToDto(chartType);
    }
}
