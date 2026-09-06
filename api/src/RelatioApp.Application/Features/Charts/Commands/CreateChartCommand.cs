using MediatR;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Mappings;
using RelatioApp.Domain.Entities;
using RelatioApp.Domain.Enums;

namespace RelatioApp.Application.Features.Charts.Commands;

public record CreateChartCommand(CreateChartDto Input) : IRequest<ChartDto>;

public class CreateChartHandler : IRequestHandler<CreateChartCommand, ChartDto>
{
    private readonly IChartRepository _repository;

    public CreateChartHandler(IChartRepository repository) => _repository = repository;

    public async Task<ChartDto> Handle(CreateChartCommand request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Input.Name))
        {
            throw ValidationErrors.Field("name", "Name is required.");
        }

        var trimmedName = request.Input.Name.Trim();
        if (await _repository.ExistsByNameAsync(trimmedName, ct: ct))
        {
            throw new ConflictException($"A chart named '{trimmedName}' already exists.");
        }

        if (!ChartMapper.TryParseMode(request.Input.Mode, out var mode))
        {
            throw ValidationErrors.Field("mode", "Mode must be 'org' or 'family'.");
        }

        var chart = new Chart { Name = trimmedName, Mode = mode, IsExample = request.Input.IsExample };
        var created = await _repository.CreateAsync(chart, ct);
        return ChartMapper.ToDto(created);
    }
}
