using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.Charts.Commands;

public record DeleteNodeCommand(Guid ChartId, Guid NodeId) : IRequest;

public class DeleteNodeHandler : IRequestHandler<DeleteNodeCommand>
{
    private readonly ITreeNodeRepository _repository;

    public DeleteNodeHandler(ITreeNodeRepository repository) => _repository = repository;

    public async Task Handle(DeleteNodeCommand request, CancellationToken ct)
    {
        var nodes = await _repository.GetByChartAsync(request.ChartId, ct);
        var node = nodes.FirstOrDefault(n => n.Id == request.NodeId)
            ?? throw new NotFoundException(nameof(TreeNode), request.NodeId);

        // Soft delete only.
        node.IsDeleted = true;
        node.UpdatedAt = DateTime.UtcNow;

        // Children become roots; partner links removed (both directions).
        foreach (var other in nodes)
        {
            if (other.ParentId == node.Id)
            {
                other.ParentId = null;
            }

            if (other.PartnerId == node.Id)
            {
                other.PartnerId = null;
            }
        }

        await _repository.SaveChangesAsync(ct);
    }
}
