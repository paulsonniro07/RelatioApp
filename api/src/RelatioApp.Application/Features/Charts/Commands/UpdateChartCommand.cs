using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Mappings;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.Charts.Commands;

public record UpdateChartCommand(
    Guid ChartId,
    string? Name,
    Guid? ChartTypeId,
    string? SortKey,
    string? SortDir) : IRequest<ChartDto>;

public class UpdateChartHandler : IRequestHandler<UpdateChartCommand, ChartDto>
{
    private readonly IChartRepository _repository;
    private readonly IChartTypeRepository _chartTypeRepository;

    public UpdateChartHandler(
        IChartRepository repository,
        IChartTypeRepository chartTypeRepository)
    {
        _repository = repository;
        _chartTypeRepository = chartTypeRepository;
    }

    public async Task<ChartDto> Handle(UpdateChartCommand request, CancellationToken ct)
    {
        var chart = await _repository.GetByIdWithNodesAsync(request.ChartId, ct)
            ?? throw new NotFoundException(nameof(Chart), request.ChartId);

        var hasName = !string.IsNullOrWhiteSpace(request.Name);
        var hasChartType = request.ChartTypeId.HasValue;
        var hasSort =
            !string.IsNullOrWhiteSpace(request.SortKey) ||
            !string.IsNullOrWhiteSpace(request.SortDir);

        if (!hasName && !hasChartType && !hasSort)
        {
            throw ValidationErrors.Field("name", "Provide a name, chart type or sort to update.");
        }

        if (hasName)
        {
            var trimmedName = request.Name!.Trim();
            if (await _repository.ExistsByNameAsync(trimmedName, excludeId: request.ChartId, ct))
            {
                throw new ConflictException($"A chart named '{trimmedName}' already exists.");
            }

            chart.Name = trimmedName;
        }

        if (hasChartType)
        {
            if (await _chartTypeRepository.GetByIdAsync(request.ChartTypeId!.Value, ct) is null)
            {
                throw ValidationErrors.Field("chartTypeId", "Chart type not found.");
            }

            chart.ChartTypeId = request.ChartTypeId;
        }

        if (hasSort)
        {
            chart.SortKey = ChartMapper.NormalizeSortKey(request.SortKey ?? chart.SortKey);
            chart.SortDir = ChartMapper.NormalizeSortDir(request.SortDir ?? chart.SortDir);
        }

        await _repository.SaveChangesAsync(ct);
        return ChartMapper.ToDto(chart);
    }
}
