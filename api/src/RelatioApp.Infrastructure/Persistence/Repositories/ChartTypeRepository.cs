using Microsoft.EntityFrameworkCore;

using RelatioApp.Application.Common;
using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Domain.Entities;

namespace RelatioApp.Infrastructure.Persistence.Repositories;

public class ChartTypeRepository : GenericRepository<ChartType>, IChartTypeRepository
{
    public ChartTypeRepository(AppDbContext context) : base(context) { }

    public async Task<ChartType?> GetByIdWithRelationshipsAsync(
        Guid id,
        CancellationToken ct = default)
        => await _context.ChartTypes
            .Include(ct => ct.Relationships)
            .FirstOrDefaultAsync(ct => ct.Id == id && !ct.IsDeleted, ct);

    public void AddRelationship(RelationshipTypeDefinition relationship)
        => _context.RelationshipTypeDefinitions.Add(relationship);

    public async Task<PaginatedList<ChartType>> GetPagedWithRelationshipsAsync(
        PaginationFilter filter,
        CancellationToken ct = default)
    {
        var pageNumber = filter.GetSafePageNumber();
        var pageSize = filter.GetSafePageSize();

        var query = _context.ChartTypes
            .Include(ct => ct.Relationships)
            .Where(ct => !ct.IsDeleted);

        if (!string.IsNullOrWhiteSpace(filter.SearchKeyword))
        {
            var keyword = filter.SearchKeyword.Trim().ToLower();
            query = query.Where(ct => ct.Name.ToLower().Contains(keyword));
        }

        query = filter.IsDescending
            ? query.OrderByDescending(ct => ct.CreatedAt)
            : query.OrderBy(ct => ct.CreatedAt);

        var totalCount = await query.CountAsync(ct);
        var data = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return PaginatedList<ChartType>.Create(data, totalCount, pageNumber, pageSize);
    }

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
