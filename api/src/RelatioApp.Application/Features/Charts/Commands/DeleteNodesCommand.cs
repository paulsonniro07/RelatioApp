using MediatR;

using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.Charts.Commands;

public record DeleteNodesCommand(Guid ChartId, List<Guid> NodeIds) : IRequest;

public class DeleteNodesHandler : IRequestHandler<DeleteNodesCommand>
{
    private readonly ITreeNodeRepository _repository;

    public DeleteNodesHandler(ITreeNodeRepository repository) => _repository = repository;

    public async Task Handle(DeleteNodesCommand request, CancellationToken ct)
    {
        var nodes = await _repository.GetByChartAsync(request.ChartId, ct);
        var targets = nodes.Where(n => request.NodeIds.Contains(n.Id)).ToList();
        if (targets.Count == 0) return;

        var targetIds = targets.Select(t => t.Id).ToHashSet();

        // Soft delete only — never hard-delete rows.
        foreach (var node in targets)
        {
            node.IsDeleted = true;
            node.UpdatedAt = DateTime.UtcNow;
        }

        // Detach children and clear partner references (both directions).
        foreach (var other in nodes)
        {
            if (other.ParentId is Guid parentId && targetIds.Contains(parentId))
            {
                other.ParentId = null;
            }

            if (other.PartnerId is Guid partnerId && targetIds.Contains(partnerId))
            {
                other.PartnerId = null;
            }
        }

        await _repository.SaveChangesAsync(ct);
    }
}
