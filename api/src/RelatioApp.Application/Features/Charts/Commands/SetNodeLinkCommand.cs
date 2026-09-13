using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Mappings;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.Charts.Commands;

/// <summary>
/// Sets or clears a node's cross-chart navigation link. The reciprocal side is
/// set by the client in the same action (no shared/synced data).
/// </summary>
public record SetNodeLinkCommand(
    Guid ChartId,
    Guid NodeId,
    Guid? TargetChartId,
    Guid? TargetNodeId) : IRequest<TreeNodeDto>;

public class SetNodeLinkHandler : IRequestHandler<SetNodeLinkCommand, TreeNodeDto>
{
    private readonly ITreeNodeRepository _nodeRepository;
    private readonly IChartRepository _chartRepository;

    public SetNodeLinkHandler(
        ITreeNodeRepository nodeRepository,
        IChartRepository chartRepository)
    {
        _nodeRepository = nodeRepository;
        _chartRepository = chartRepository;
    }

    public async Task<TreeNodeDto> Handle(SetNodeLinkCommand request, CancellationToken ct)
    {
        var node = await _nodeRepository.GetInChartAsync(request.ChartId, request.NodeId, ct)
            ?? throw new NotFoundException(nameof(TreeNode), request.NodeId);

        if (request.TargetChartId is Guid targetChartId &&
            request.TargetNodeId is Guid targetNodeId)
        {
            if (targetChartId == request.ChartId && targetNodeId == request.NodeId)
            {
                throw new ConflictException("A node cannot link to itself.");
            }

            if (!await _chartRepository.ExistsAsync(targetChartId, ct))
            {
                throw ValidationErrors.Field("targetChartId", "Target chart not found.");
            }

            if (await _nodeRepository.GetInChartAsync(targetChartId, targetNodeId, ct) is null)
            {
                throw ValidationErrors.Field(
                    "targetNodeId",
                    "Target node not found in that chart.");
            }

            node.LinkedChartId = targetChartId;
            node.LinkedNodeId = targetNodeId;
        }
        else
        {
            node.LinkedChartId = null;
            node.LinkedNodeId = null;
        }

        await _nodeRepository.SaveChangesAsync(ct);
        return ChartMapper.ToDto(node);
    }
}
