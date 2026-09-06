using Microsoft.EntityFrameworkCore;

using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Infrastructure.Persistence.Repositories;

public class ChartRepository : GenericRepository<Chart>, IChartRepository
{
    public ChartRepository(AppDbContext context) : base(context) { }

    public async Task<Chart?> GetByIdWithNodesAsync(
        Guid chartId,
        CancellationToken ct = default)
        => await _context.Charts
            .Include(c => c.Nodes)
            .FirstOrDefaultAsync(c => c.Id == chartId && !c.IsDeleted, ct);

    public async Task<bool> ExistsAsync(Guid chartId, CancellationToken ct = default)
        => await _dbSet.AnyAsync(e => e.Id == chartId && !e.IsDeleted, ct);

    public async Task<bool> ExistsByNameAsync(
        string name,
        Guid? excludeId = null,
        CancellationToken ct = default)
        => await _dbSet.AnyAsync(
            e => !e.IsDeleted &&
                 e.Name.ToLower() == name.ToLower() &&
                 (excludeId == null || e.Id != excludeId),
            ct);
}
