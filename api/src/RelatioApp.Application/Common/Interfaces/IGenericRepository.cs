using System.Linq.Expressions;

using RelatioApp.Domain.Common;

namespace RelatioApp.Application.Common.Interfaces;

public interface IGenericRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<PaginatedList<T>> GetPagedAsync(
        PaginationFilter filter,
        Expression<Func<T, bool>>? searchPredicate = null,
        Expression<Func<T, object>>? orderBy = null,
        CancellationToken ct = default);

    Task<T> CreateAsync(T entity, CancellationToken ct = default);

    Task<T> UpdateAsync(T entity, CancellationToken ct = default);

    Task<int> SaveChangesAsync(CancellationToken ct = default);

    Task SoftDeleteAsync(Guid id, CancellationToken ct = default);

    Task RestoreAsync(Guid id, CancellationToken ct = default);
}
