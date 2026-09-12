using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Mappings;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.Charts.Commands;

public record UpdateNodeCommand(Guid ChartId, Guid NodeId, UpdateNodeDto Input)
    : IRequest<TreeNodeDto>;

public class UpdateNodeHandler : IRequestHandler<UpdateNodeCommand, TreeNodeDto>
{
    private readonly ITreeNodeRepository _repository;

    public UpdateNodeHandler(ITreeNodeRepository repository) => _repository = repository;

    public async Task<TreeNodeDto> Handle(UpdateNodeCommand request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Input.Name))
        {
            throw ValidationErrors.Field("name", "Name is required.");
        }

        var node = await _repository.GetInChartAsync(request.ChartId, request.NodeId, ct)
            ?? throw new NotFoundException(nameof(TreeNode), request.NodeId);

        node.Name = request.Input.Name.Trim();
        node.Level = request.Input.Level ?? string.Empty;
        node.RoleOrRelationship = request.Input.Role ?? string.Empty;
        node.RelationshipTypeId = request.Input.RelationshipTypeId;
        node.Notes = request.Input.Notes ?? string.Empty;
        node.PhotoUrl = request.Input.PhotoUrl;

        await _repository.SaveChangesAsync(ct);
        return ChartMapper.ToDto(node);
    }
}
