using Microsoft.EntityFrameworkCore;

using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Infrastructure.Persistence.Repositories;

public class TreeNodeRepository : GenericRepository<TreeNode>, ITreeNodeRepository
{
    public TreeNodeRepository(AppDbContext context) : base(context) { }

    public async Task<List<TreeNode>> GetByChartAsync(
        Guid chartId,
        CancellationToken ct = default)
        => await _dbSet
            .Where(n => n.ChartId == chartId && !n.IsDeleted)
            .ToListAsync(ct);

    public async Task<TreeNode?> GetInChartAsync(
        Guid chartId,
        Guid nodeId,
        CancellationToken ct = default)
        => await _dbSet.FirstOrDefaultAsync(
            n => n.ChartId == chartId && n.Id == nodeId && !n.IsDeleted,
            ct);
}
