using MediatR;

using RelatioApp.Application.Common;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Mappings;

namespace RelatioApp.Application.Features.ChartTypes.Queries;

public record GetChartTypesQuery(PaginationFilter Filter)
    : IRequest<PaginatedList<ChartTypeDto>>;

public class GetChartTypesHandler
    : IRequestHandler<GetChartTypesQuery, PaginatedList<ChartTypeDto>>
{
    private readonly IChartTypeRepository _repository;

    public GetChartTypesHandler(IChartTypeRepository repository) => _repository = repository;

    public async Task<PaginatedList<ChartTypeDto>> Handle(
        GetChartTypesQuery request,
        CancellationToken ct)
    {
        request.Filter.PageSize = Math.Min(request.Filter.PageSize, 100);
        var result = await _repository.GetPagedWithRelationshipsAsync(request.Filter, ct);

        return new PaginatedList<ChartTypeDto>
        {
            Data = result.Data.Select(ChartMapper.ToDto).ToList(),
            TotalCount = result.TotalCount,
            PageNumber = result.PageNumber,
            PageSize = result.PageSize,
            TotalPages = result.TotalPages,
        };
    }
}
