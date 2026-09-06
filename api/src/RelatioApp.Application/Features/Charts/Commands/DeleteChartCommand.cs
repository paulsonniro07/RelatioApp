using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.Charts.Commands;

public record DeleteChartCommand(Guid ChartId) : IRequest;

public class DeleteChartHandler : IRequestHandler<DeleteChartCommand>
{
    private readonly IChartRepository _repository;

    public DeleteChartHandler(IChartRepository repository) => _repository = repository;

    public async Task Handle(DeleteChartCommand request, CancellationToken ct)
    {
        var chart = await _repository.GetByIdWithNodesAsync(request.ChartId, ct)
            ?? throw new NotFoundException(nameof(Chart), request.ChartId);

        // Soft delete only — never hard-delete rows.
        chart.IsDeleted = true;
        chart.UpdatedAt = DateTime.UtcNow;

        foreach (var node in chart.Nodes)
        {
            node.IsDeleted = true;
            node.UpdatedAt = DateTime.UtcNow;
        }

        await _repository.SaveChangesAsync(ct);
    }
}
