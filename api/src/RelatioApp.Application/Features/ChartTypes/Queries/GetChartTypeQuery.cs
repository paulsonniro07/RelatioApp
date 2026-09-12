using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Mappings;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.ChartTypes.Queries;

public record GetChartTypeQuery(Guid ChartTypeId) : IRequest<ChartTypeDto>;

public class GetChartTypeHandler : IRequestHandler<GetChartTypeQuery, ChartTypeDto>
{
    private readonly IChartTypeRepository _repository;

    public GetChartTypeHandler(IChartTypeRepository repository) => _repository = repository;

    public async Task<ChartTypeDto> Handle(GetChartTypeQuery request, CancellationToken ct)
    {
        var chartType = await _repository.GetByIdWithRelationshipsAsync(request.ChartTypeId, ct)
            ?? throw new NotFoundException(nameof(ChartType), request.ChartTypeId);

        return ChartMapper.ToDto(chartType);
    }
}
