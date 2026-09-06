using MediatR;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using RelatioApp.Application.Common.Exceptions;
using RelatioApp.Application.DTOs.Charts;
using RelatioApp.Application.Features.Charts.Commands;

namespace RelatioApp.API.Controllers;

[ApiController]
[Route("api/charts/{chartId:guid}/nodes")]
public class NodesController : ControllerBase
{
    private readonly IMediator _mediator;

    public NodesController(IMediator mediator) => _mediator = mediator;

    [HttpPost]
    public async Task<IActionResult> Create(
        Guid chartId,
        [FromBody] CreateNodeDto input,
        CancellationToken ct)
    {
        var created = await _mediator.Send(new CreateNodeCommand(chartId, input), ct);
        return CreatedAtAction(nameof(Update), new { chartId, nodeId = created.Id }, created);
    }

    [HttpPut("{nodeId:guid}")]
    public async Task<IActionResult> Update(
        Guid chartId,
        Guid nodeId,
        [FromBody] UpdateNodeDto input,
        CancellationToken ct)
        => Ok(await _mediator.Send(new UpdateNodeCommand(chartId, nodeId, input), ct));

    [HttpPut("{nodeId:guid}/parent")]
    public async Task<IActionResult> SetParent(
        Guid chartId,
        Guid nodeId,
        [FromBody] SetParentRequest request,
        CancellationToken ct)
        => Ok(await _mediator.Send(new SetParentCommand(chartId, nodeId, request.ParentId), ct));

    [HttpPut("{nodeId:guid}/position")]
    public async Task<IActionResult> SetPosition(
        Guid chartId,
        Guid nodeId,
        [FromBody] SetPositionRequest request,
        CancellationToken ct)
        => Ok(await _mediator.Send(
            new SetPositionCommand(chartId, nodeId, request.PositionX, request.PositionY),
            ct));

    [HttpPut("{nodeId:guid}/partner")]
    public async Task<IActionResult> SetPartner(
        Guid chartId,
        Guid nodeId,
        [FromBody] SetPartnerRequest request,
        CancellationToken ct)
        => Ok(await _mediator.Send(
            new SetPartnerCommand(chartId, nodeId, request.PartnerId),
            ct));

    [HttpPost("{nodeId:guid}/photo")]
    [RequestSizeLimit(8_000_000)]
    public async Task<IActionResult> UploadPhoto(
        Guid chartId,
        Guid nodeId,
        IFormFile file,
        CancellationToken ct)
    {
        if (file is null || file.Length == 0)
        {
            throw ValidationErrors.Field("photo", "Choose an image file to upload.");
        }

        await using var stream = new MemoryStream();
        await file.CopyToAsync(stream, ct);
        var updated = await _mediator.Send(
            new SetNodePhotoCommand(chartId, nodeId, stream.ToArray()),
            ct);
        return Ok(updated);
    }

    [HttpDelete("{nodeId:guid}/photo")]
    public async Task<IActionResult> DeletePhoto(Guid chartId, Guid nodeId, CancellationToken ct)
        => Ok(await _mediator.Send(new ClearNodePhotoCommand(chartId, nodeId), ct));

    [HttpDelete("{nodeId:guid}")]
    public async Task<IActionResult> Delete(Guid chartId, Guid nodeId, CancellationToken ct)
    {
        await _mediator.Send(new DeleteNodeCommand(chartId, nodeId), ct);
        return NoContent();
    }

    [HttpDelete]
    public async Task<IActionResult> Clear(Guid chartId, CancellationToken ct)
    {
        await _mediator.Send(new ClearChartNodesCommand(chartId), ct);
        return NoContent();
    }

    [HttpPost("batch-delete")]
    public async Task<IActionResult> BatchDelete(
        Guid chartId,
        [FromBody] DeleteNodesRequest request,
        CancellationToken ct)
    {
        await _mediator.Send(new DeleteNodesCommand(chartId, request.NodeIds), ct);
        return NoContent();
    }
}

public record SetParentRequest(Guid? ParentId);

public record SetPositionRequest(double PositionX, double PositionY);

public record SetPartnerRequest(Guid? PartnerId);

public record DeleteNodesRequest(List<Guid> NodeIds);
