using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Mappings;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.Charts.Commands;

public record CreateNodeCommand(Guid ChartId, CreateNodeDto Input) : IRequest<TreeNodeDto>;

public class CreateNodeHandler : IRequestHandler<CreateNodeCommand, TreeNodeDto>
{
    private readonly IChartRepository _chartRepository;
    private readonly ITreeNodeRepository _nodeRepository;

    public CreateNodeHandler(IChartRepository chartRepository, ITreeNodeRepository nodeRepository)
    {
        _chartRepository = chartRepository;
        _nodeRepository = nodeRepository;
    }

    public async Task<TreeNodeDto> Handle(CreateNodeCommand request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Input.Name))
        {
            throw ValidationErrors.Field("name", "Name is required.");
        }

        if (!await _chartRepository.ExistsAsync(request.ChartId, ct))
        {
            throw new NotFoundException(nameof(Chart), request.ChartId);
        }

        if (request.Input.ParentId is Guid parentId &&
            await _nodeRepository.GetInChartAsync(request.ChartId, parentId, ct) is null)
        {
            throw ValidationErrors.Field("parentId", "Parent node not found in this chart.");
        }

        var node = new TreeNode
        {
            ChartId = request.ChartId,
            Name = request.Input.Name.Trim(),
            ParentId = request.Input.ParentId,
            PartnerId = null,
            Level = request.Input.Level ?? string.Empty,
            RoleOrRelationship = request.Input.Role ?? string.Empty,
            RelationshipTypeId = request.Input.RelationshipTypeId,
            BirthDate = request.Input.BirthDate,
            Sequence = request.Input.Sequence,
            Notes = request.Input.Notes ?? string.Empty,
            PhotoUrl = request.Input.PhotoUrl,
            PositionX = request.Input.PositionX,
            PositionY = request.Input.PositionY,
        };

        var created = await _nodeRepository.CreateAsync(node, ct);

        if (request.Input.PartnerId is Guid partnerId && partnerId != created.Id)
        {
            var partner = await _nodeRepository.GetInChartAsync(request.ChartId, partnerId, ct);
            if (partner is not null)
            {
                created.PartnerId = partnerId;
                partner.PartnerId = created.Id;
                await _nodeRepository.SaveChangesAsync(ct);
            }
        }

        return ChartMapper.ToDto(created);
    }
}
