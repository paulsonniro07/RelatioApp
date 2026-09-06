using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Mappings;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.Charts.Commands;

public record SetNodePhotoCommand(Guid ChartId, Guid NodeId, byte[] Content)
    : IRequest<TreeNodeDto>;

public class SetNodePhotoHandler : IRequestHandler<SetNodePhotoCommand, TreeNodeDto>
{
    private readonly ITreeNodeRepository _repository;
    private readonly IFileStorage _fileStorage;

    public SetNodePhotoHandler(ITreeNodeRepository repository, IFileStorage fileStorage)
    {
        _repository = repository;
        _fileStorage = fileStorage;
    }

    public async Task<TreeNodeDto> Handle(SetNodePhotoCommand request, CancellationToken ct)
    {
        var node = await _repository.GetInChartAsync(request.ChartId, request.NodeId, ct)
            ?? throw new NotFoundException(nameof(TreeNode), request.NodeId);

        if (request.Content.Length == 0 || request.Content.Length > ImageContent.MaxPhotoBytes)
        {
            throw ValidationErrors.Field("photo", "Photo must be a supported image up to 5 MB.");
        }

        var extension = ImageContent.DetectExtension(request.Content)
            ?? throw ValidationErrors.Field("photo", "Unsupported image. Use JPG, PNG, WebP or GIF.");

        // Save the new file first, then point the node at it and drop the old one.
        var fileName = $"{Guid.NewGuid():N}.{extension}";
        await _fileStorage.SaveAsync(fileName, request.Content, ct);

        var previousFile = ImageContent.FileNameFromUrl(node.PhotoUrl);
        node.PhotoUrl = $"/api/uploads/{fileName}";
        node.UpdatedAt = DateTime.UtcNow;
        await _repository.SaveChangesAsync(ct);

        if (previousFile is not null)
        {
            _fileStorage.Delete(previousFile);
        }

        return ChartMapper.ToDto(node);
    }
}
