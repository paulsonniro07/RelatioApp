using RelatioApp.Domain.Entities;

namespace RelatioApp.Application.Common.Interfaces;

public interface ITreeNodeRepository : IGenericRepository<TreeNode>
{
    Task<List<TreeNode>> GetByChartAsync(Guid chartId, CancellationToken ct = default);

    Task<TreeNode?> GetInChartAsync(Guid chartId, Guid nodeId, CancellationToken ct = default);
}
