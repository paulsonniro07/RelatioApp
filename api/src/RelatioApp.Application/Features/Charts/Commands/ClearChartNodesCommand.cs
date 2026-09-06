using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.Charts.Commands;

public record ClearChartNodesCommand(Guid ChartId) : IRequest;

public class ClearChartNodesHandler : IRequestHandler<ClearChartNodesCommand>
{
    private readonly IChartRepository _chartRepository;
    private readonly ITreeNodeRepository _nodeRepository;

    public ClearChartNodesHandler(
        IChartRepository chartRepository,
        ITreeNodeRepository nodeRepository)
    {
        _chartRepository = chartRepository;
        _nodeRepository = nodeRepository;
    }

    public async Task Handle(ClearChartNodesCommand request, CancellationToken ct)
    {
        if (!await _chartRepository.ExistsAsync(request.ChartId, ct))
        {
            throw new NotFoundException(nameof(Chart), request.ChartId);
        }

        var nodes = await _nodeRepository.GetByChartAsync(request.ChartId, ct);
        foreach (var node in nodes)
        {
            node.IsDeleted = true;
            node.UpdatedAt = DateTime.UtcNow;
        }

        await _nodeRepository.SaveChangesAsync(ct);
    }
}
