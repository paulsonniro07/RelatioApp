using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.ChartTypes.Mappings;
using RelatioApp.Application.Features.Charts.Mappings;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.ChartTypes.Commands;

public record CreateChartTypeCommand(CreateChartTypeDto Input) : IRequest<ChartTypeDto>;

public class CreateChartTypeHandler : IRequestHandler<CreateChartTypeCommand, ChartTypeDto>
{
    private readonly IChartTypeRepository _repository;

    public CreateChartTypeHandler(IChartTypeRepository repository) => _repository = repository;

    public async Task<ChartTypeDto> Handle(CreateChartTypeCommand request, CancellationToken ct)
    {
        var name = request.Input.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(name))
        {
            throw ValidationErrors.Field("name", "Name is required.");
        }

        if (await _repository.ExistsByNameAsync(name, ct: ct))
        {
            throw new ConflictException($"A chart type named '{name}' already exists.");
        }

        var chartType = new ChartType
        {
            Name = name,
            IsExample = request.Input.IsExample,
            Relationships = ChartTypeRelationshipMapper.Build(request.Input.Relationships),
        };

        var created = await _repository.CreateAsync(chartType, ct);
        return ChartMapper.ToDto(created);
    }
}
