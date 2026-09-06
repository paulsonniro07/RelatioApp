using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Mappings;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.Charts.Queries;

public record GetChartQuery(Guid ChartId) : IRequest<ChartDto>;

public class GetChartHandler : IRequestHandler<GetChartQuery, ChartDto>
{
    private readonly IChartRepository _repository;

    public GetChartHandler(IChartRepository repository) => _repository = repository;

    public async Task<ChartDto> Handle(GetChartQuery request, CancellationToken ct)
    {
        var chart = await _repository.GetByIdWithNodesAsync(request.ChartId, ct)
            ?? throw new NotFoundException(nameof(Chart), request.ChartId);

        return ChartMapper.ToDto(chart);
    }
}
