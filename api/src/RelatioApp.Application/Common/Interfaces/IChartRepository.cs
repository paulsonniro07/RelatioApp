using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Common.Interfaces;

public interface IChartRepository : IGenericRepository<Chart>
{
    Task<Chart?> GetByIdWithNodesAsync(Guid chartId, CancellationToken ct = default);

    Task<bool> ExistsAsync(Guid chartId, CancellationToken ct = default);

    /// <summary>Case-insensitive name check (soft-deleted charts excluded).</summary>
    Task<bool> ExistsByNameAsync(string name, Guid? excludeId = null, CancellationToken ct = default);
}
