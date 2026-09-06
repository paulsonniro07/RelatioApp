using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Mappings;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.Charts.Commands;

public record SetPartnerCommand(Guid ChartId, Guid NodeId, Guid? PartnerId)
    : IRequest<TreeNodeDto>;

public class SetPartnerHandler : IRequestHandler<SetPartnerCommand, TreeNodeDto>
{
    private readonly ITreeNodeRepository _repository;

    public SetPartnerHandler(ITreeNodeRepository repository) => _repository = repository;

    public async Task<TreeNodeDto> Handle(SetPartnerCommand request, CancellationToken ct)
    {
        var node = await _repository.GetInChartAsync(request.ChartId, request.NodeId, ct)
            ?? throw new NotFoundException(nameof(TreeNode), request.NodeId);

        if (request.PartnerId is Guid partnerId)
        {
            if (partnerId == node.Id)
            {
                throw new ConflictException("A node cannot be its own partner.");
            }

            var partner = await _repository.GetInChartAsync(request.ChartId, partnerId, ct)
                ?? throw ValidationErrors.Field("partnerId", "Partner node not found in this chart.");

            await ClearPartnerLinkAsync(request.ChartId, node, ct);
            await ClearPartnerLinkAsync(request.ChartId, partner, ct);

            node.PartnerId = partnerId;
            partner.PartnerId = node.Id;
        }
        else
        {
            await ClearPartnerLinkAsync(request.ChartId, node, ct);
        }

        await _repository.SaveChangesAsync(ct);
        return ChartMapper.ToDto(node);
    }

    /// <summary>Removes a node's partner reference from both sides of the link.</summary>
    private async Task ClearPartnerLinkAsync(
        Guid chartId,
        TreeNode node,
        CancellationToken ct)
    {
        if (node.PartnerId is not Guid oldPartnerId) return;

        var oldPartner = await _repository.GetInChartAsync(chartId, oldPartnerId, ct);
        if (oldPartner is not null && oldPartner.PartnerId == node.Id)
        {
            oldPartner.PartnerId = null;
        }

        node.PartnerId = null;
    }
}
