using System.Linq.Expressions;

using Microsoft.EntityFrameworkCore;

using RelatioApp.Application.Common;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Domain.Common;

namespace RelatioApp.Infrastructure.Persistence.Repositories;

public class GenericRepository<T> : IGenericRepository<T> where T : BaseEntity
{
    protected readonly AppDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public GenericRepository(AppDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public virtual async Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _dbSet.FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted, ct);

    public virtual async Task<PaginatedList<T>> GetPagedAsync(
        PaginationFilter filter,
        Expression<Func<T, bool>>? searchPredicate = null,
        Expression<Func<T, object>>? orderBy = null,
        CancellationToken ct = default)
    {
        var pageNumber = filter.GetSafePageNumber();
        var pageSize = filter.GetSafePageSize();

        var query = _dbSet.Where(e => !e.IsDeleted);
        if (searchPredicate is not null) query = query.Where(searchPredicate);
        if (orderBy is not null)
        {
            query = filter.IsDescending
                ? query.OrderByDescending(orderBy)
                : query.OrderBy(orderBy);
        }
        else
        {
            query = query.OrderBy(e => e.Id);
        }

        var totalCount = await query.CountAsync(ct);
        var data = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return PaginatedList<T>.Create(data, totalCount, pageNumber, pageSize);
    }

    public virtual async Task<T> CreateAsync(T entity, CancellationToken ct = default)
    {
        await _dbSet.AddAsync(entity, ct);
        await _context.SaveChangesAsync(ct);
        return entity;
    }

    public virtual async Task<T> UpdateAsync(T entity, CancellationToken ct = default)
    {
        _dbSet.Update(entity);
        await _context.SaveChangesAsync(ct);
        return entity;
    }

    public virtual async Task<int> SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);

    public virtual async Task SoftDeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _dbSet
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.Id == id, ct);
        if (entity is null) return;
        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    public virtual async Task RestoreAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _dbSet
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.Id == id, ct);
        if (entity is null) return;
        entity.IsDeleted = false;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }
}
