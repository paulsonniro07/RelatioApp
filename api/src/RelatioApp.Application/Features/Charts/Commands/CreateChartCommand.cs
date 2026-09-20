using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Mappings;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.Charts.Commands;

public record CreateChartCommand(CreateChartDto Input) : IRequest<ChartDto>;

public class CreateChartHandler : IRequestHandler<CreateChartCommand, ChartDto>
{
    private readonly IChartRepository _repository;
    private readonly IChartTypeRepository _chartTypeRepository;

    public CreateChartHandler(
        IChartRepository repository,
        IChartTypeRepository chartTypeRepository)
    {
        _repository = repository;
        _chartTypeRepository = chartTypeRepository;
    }

    public async Task<ChartDto> Handle(CreateChartCommand request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Input.Name))
        {
            throw ValidationErrors.Field("name", "Name is required.");
        }

        var trimmedName = request.Input.Name.Trim();
        if (await _repository.ExistsByNameAsync(trimmedName, ct: ct))
        {
            throw new ConflictException($"A chart named '{trimmedName}' already exists.");
        }

        if (await _chartTypeRepository.GetByIdAsync(request.Input.ChartTypeId, ct) is null)
        {
            throw ValidationErrors.Field("chartTypeId", "Chart type not found.");
        }

        var chart = new Chart
        {
            Name = trimmedName,
            ChartTypeId = request.Input.ChartTypeId,
            SortKey = ChartMapper.NormalizeSortKey(request.Input.SortKey),
            SortDir = ChartMapper.NormalizeSortDir(request.Input.SortDir),
            IsExample = request.Input.IsExample,
        };
        var created = await _repository.CreateAsync(chart, ct);
        return ChartMapper.ToDto(created);
    }
}
