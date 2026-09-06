using MediatR;

using RelatioApp.Application.Common;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Mappings;

namespace RelatioApp.Application.Features.Charts.Queries;

public record GetChartsQuery(PaginationFilter Filter) : IRequest<PaginatedList<ChartSummaryDto>>;

public class GetChartsHandler : IRequestHandler<GetChartsQuery, PaginatedList<ChartSummaryDto>>
{
    private readonly IChartRepository _repository;

    public GetChartsHandler(IChartRepository repository) => _repository = repository;

    public async Task<PaginatedList<ChartSummaryDto>> Handle(
        GetChartsQuery request,
        CancellationToken ct)
    {
        request.Filter.PageSize = Math.Min(request.Filter.PageSize, 100);
        var result = await _repository.GetPagedAsync(request.Filter, ct: ct);

        return new PaginatedList<ChartSummaryDto>
        {
            Data = result.Data.Select(ChartMapper.ToSummaryDto).ToList(),
            TotalCount = result.TotalCount,
            PageNumber = result.PageNumber,
            PageSize = result.PageSize,
            TotalPages = result.TotalPages,
        };
    }
}
