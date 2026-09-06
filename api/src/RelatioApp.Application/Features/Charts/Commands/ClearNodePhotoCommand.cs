using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Mappings;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.Charts.Commands;

public record ClearNodePhotoCommand(Guid ChartId, Guid NodeId) : IRequest<TreeNodeDto>;

public class ClearNodePhotoHandler : IRequestHandler<ClearNodePhotoCommand, TreeNodeDto>
{
    private readonly ITreeNodeRepository _repository;
    private readonly IFileStorage _fileStorage;

    public ClearNodePhotoHandler(ITreeNodeRepository repository, IFileStorage fileStorage)
    {
        _repository = repository;
        _fileStorage = fileStorage;
    }

    public async Task<TreeNodeDto> Handle(ClearNodePhotoCommand request, CancellationToken ct)
    {
        var node = await _repository.GetInChartAsync(request.ChartId, request.NodeId, ct)
            ?? throw new NotFoundException(nameof(TreeNode), request.NodeId);

        var previousFile = ImageContent.FileNameFromUrl(node.PhotoUrl);
        node.PhotoUrl = null;
        node.UpdatedAt = DateTime.UtcNow;
        await _repository.SaveChangesAsync(ct);

        if (previousFile is not null)
        {
            _fileStorage.Delete(previousFile);
        }

        return ChartMapper.ToDto(node);
    }
}
