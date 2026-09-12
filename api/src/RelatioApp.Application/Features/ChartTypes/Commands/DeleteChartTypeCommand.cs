using MediatR;

using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Features.ChartTypes.Commands;

public record DeleteChartTypeCommand(Guid ChartTypeId) : IRequest;

public class DeleteChartTypeHandler : IRequestHandler<DeleteChartTypeCommand>
{
    private readonly IChartTypeRepository _repository;

    public DeleteChartTypeHandler(IChartTypeRepository repository) => _repository = repository;

    public async Task Handle(DeleteChartTypeCommand request, CancellationToken ct)
    {
        // Soft delete only. Charts referencing this type fall back client-side.
        await _repository.SoftDeleteAsync(request.ChartTypeId, ct);
    }
}
