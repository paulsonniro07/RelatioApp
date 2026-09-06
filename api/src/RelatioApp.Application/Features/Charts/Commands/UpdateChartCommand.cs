using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Mappings;
using RelatioApp.Domain.Entities;
using RelatioApp.Domain.Enums;

namespace RelatioApp.Application.Features.Charts.Commands;

public record UpdateChartCommand(Guid ChartId, string? Name, string? Mode) : IRequest<ChartDto>;

public class UpdateChartHandler : IRequestHandler<UpdateChartCommand, ChartDto>
{
    private readonly IChartRepository _repository;

    public UpdateChartHandler(IChartRepository repository) => _repository = repository;

    public async Task<ChartDto> Handle(UpdateChartCommand request, CancellationToken ct)
    {
        var chart = await _repository.GetByIdWithNodesAsync(request.ChartId, ct)
            ?? throw new NotFoundException(nameof(Chart), request.ChartId);

        var hasName = !string.IsNullOrWhiteSpace(request.Name);
        var hasMode = !string.IsNullOrWhiteSpace(request.Mode);

        if (!hasName && !hasMode)
        {
            throw ValidationErrors.Field("name", "Provide a name or mode to update.");
        }

        if (hasName)
        {
            var trimmedName = request.Name!.Trim();
            if (await _repository.ExistsByNameAsync(trimmedName, excludeId: request.ChartId, ct))
            {
                throw new ConflictException($"A chart named '{trimmedName}' already exists.");
            }

            chart.Name = trimmedName;
        }

        if (hasMode)
        {
            if (!ChartMapper.TryParseMode(request.Mode, out var mode))
            {
                throw ValidationErrors.Field("mode", "Mode must be 'org' or 'family'.");
            }

            chart.Mode = mode;
        }

        await _repository.SaveChangesAsync(ct);
        return ChartMapper.ToDto(chart);
    }
}
