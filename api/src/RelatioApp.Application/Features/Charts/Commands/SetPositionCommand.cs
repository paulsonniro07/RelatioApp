using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Mappings;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.Charts.Commands;

public record SetPositionCommand(Guid ChartId, Guid NodeId, double PositionX, double PositionY)
    : IRequest<TreeNodeDto>;

public class SetPositionHandler : IRequestHandler<SetPositionCommand, TreeNodeDto>
{
    private readonly ITreeNodeRepository _repository;

    public SetPositionHandler(ITreeNodeRepository repository) => _repository = repository;

    public async Task<TreeNodeDto> Handle(SetPositionCommand request, CancellationToken ct)
    {
        var node = await _repository.GetInChartAsync(request.ChartId, request.NodeId, ct)
            ?? throw new NotFoundException(nameof(TreeNode), request.NodeId);

        node.PositionX = request.PositionX;
        node.PositionY = request.PositionY;

        await _repository.SaveChangesAsync(ct);
        return ChartMapper.ToDto(node);
    }
}
