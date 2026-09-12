using RelatioApp.Application.Common;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Common.Interfaces;

public interface IChartTypeRepository : IGenericRepository<ChartType>
{
    Task<ChartType?> GetByIdWithRelationshipsAsync(Guid id, CancellationToken ct = default);

    Task<PaginatedList<ChartType>> GetPagedWithRelationshipsAsync(
        PaginationFilter filter,
        CancellationToken ct = default);

    /// <summary>Case-insensitive name check (soft-deleted chart types excluded).</summary>
    Task<bool> ExistsByNameAsync(string name, Guid? excludeId = null, CancellationToken ct = default);
}
