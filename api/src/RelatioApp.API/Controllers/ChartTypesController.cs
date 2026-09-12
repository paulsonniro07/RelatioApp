using MediatR;

using Microsoft.AspNetCore.Mvc;

using RelatioApp.Application.Common;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.ChartTypes.Commands;
using RelatioApp.Application.Features.ChartTypes.Queries;

namespace RelatioApp.API.Controllers;

[ApiController]
[Route("api/chart-types")]
public class ChartTypesController : ControllerBase
{
    private readonly IMediator _mediator;

    public ChartTypesController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] PaginationFilter filter, CancellationToken ct)
        => Ok(await _mediator.Send(new GetChartTypesQuery(filter), ct));

    [HttpGet("{chartTypeId:guid}")]
    public async Task<IActionResult> GetById(Guid chartTypeId, CancellationToken ct)
        => Ok(await _mediator.Send(new GetChartTypeQuery(chartTypeId), ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateChartTypeDto input, CancellationToken ct)
    {
        var created = await _mediator.Send(new CreateChartTypeCommand(input), ct);
        return CreatedAtAction(nameof(GetById), new { chartTypeId = created.Id }, created);
    }

    [HttpPut("{chartTypeId:guid}")]
    public async Task<IActionResult> Update(
        Guid chartTypeId,
        [FromBody] UpdateChartTypeDto input,
        CancellationToken ct)
        => Ok(await _mediator.Send(new UpdateChartTypeCommand(chartTypeId, input), ct));

    [HttpDelete("{chartTypeId:guid}")]
    public async Task<IActionResult> Delete(Guid chartTypeId, CancellationToken ct)
    {
        await _mediator.Send(new DeleteChartTypeCommand(chartTypeId), ct);
        return NoContent();
    }
}
