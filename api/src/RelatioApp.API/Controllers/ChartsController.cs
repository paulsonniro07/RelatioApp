using MediatR;

using Microsoft.AspNetCore.Mvc;

using RelatioApp.Application.Common;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Commands;
using RelatioApp.Application.Features.Charts.Queries;

namespace RelatioApp.API.Controllers;

[ApiController]
[Route("api/charts")]
public class ChartsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ChartsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] PaginationFilter filter, CancellationToken ct)
        => Ok(await _mediator.Send(new GetChartsQuery(filter), ct));

    [HttpGet("{chartId:guid}")]
    public async Task<IActionResult> GetById(Guid chartId, CancellationToken ct)
        => Ok(await _mediator.Send(new GetChartQuery(chartId), ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateChartDto input, CancellationToken ct)
    {
        var created = await _mediator.Send(new CreateChartCommand(input), ct);
        return CreatedAtAction(nameof(GetById), new { chartId = created.Id }, created);
    }

    [HttpPut("{chartId:guid}")]
    public async Task<IActionResult> Update(
        Guid chartId,
        [FromBody] UpdateChartDto input,
        CancellationToken ct)
        => Ok(await _mediator.Send(new UpdateChartCommand(chartId, input.Name, input.Mode), ct));

    [HttpDelete("{chartId:guid}")]
    public async Task<IActionResult> Delete(Guid chartId, CancellationToken ct)
    {
        await _mediator.Send(new DeleteChartCommand(chartId), ct);
        return NoContent();
    }
}
