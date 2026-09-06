using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Mappings;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.Charts.Commands;

public record SetParentCommand(Guid ChartId, Guid NodeId, Guid? ParentId)
    : IRequest<TreeNodeDto>;

public class SetParentHandler : IRequestHandler<SetParentCommand, TreeNodeDto>
{
    private readonly ITreeNodeRepository _repository;

    public SetParentHandler(ITreeNodeRepository repository) => _repository = repository;

    public async Task<TreeNodeDto> Handle(SetParentCommand request, CancellationToken ct)
    {
        var node = await _repository.GetInChartAsync(request.ChartId, request.NodeId, ct)
            ?? throw new NotFoundException(nameof(TreeNode), request.NodeId);

        if (request.ParentId is Guid newParentId)
        {
            if (newParentId == node.Id)
            {
                throw new ConflictException("A node cannot be its own parent.");
            }

            var parent = await _repository.GetInChartAsync(request.ChartId, newParentId, ct)
                ?? throw ValidationErrors.Field("parentId", "Parent node not found in this chart.");

            var allNodes = await _repository.GetByChartAsync(request.ChartId, ct);
            if (WouldCreateCycle(allNodes, node.Id, newParentId))
            {
                throw new ConflictException(
                    "Cannot set a descendant as parent — this would create a cycle.");
            }
        }

        node.ParentId = request.ParentId;
        await _repository.SaveChangesAsync(ct);
        return ChartMapper.ToDto(node);
    }

    private static bool WouldCreateCycle(List<TreeNode> nodes, Guid nodeId, Guid newParentId)
    {
        var byId = nodes.ToDictionary(n => n.Id);
        var visited = new HashSet<Guid>();
        var current = newParentId;

        while (current != Guid.Empty)
        {
            if (current == nodeId) return true;
            if (!visited.Add(current)) return false;
            if (!byId.TryGetValue(current, out var node)) return false;
            if (node.ParentId is not Guid next) return false;
            current = next;
        }

        return false;
    }
}
