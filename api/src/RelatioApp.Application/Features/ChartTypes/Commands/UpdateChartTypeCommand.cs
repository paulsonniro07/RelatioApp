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
        if (request.Input.IsExample.HasValue)
        {
            chartType.IsExample = request.Input.IsExample.Value;
        }

        ChartTypeRelationshipMapper.Apply(chartType, request.Input.Relationships);

        await _repository.SaveChangesAsync(ct);
        return ChartMapper.ToDto(chartType);
    }
}
