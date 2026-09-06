using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using RelatioApp.Domain.Entities;
using RelatioApp.Domain.Enums;

namespace RelatioApp.Infrastructure.Persistence.Configurations;

public class ChartConfiguration : IEntityTypeConfiguration<Chart>
{
    public void Configure(EntityTypeBuilder<Chart> builder)
    {
        builder.ToTable("Charts");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name).HasMaxLength(200).IsRequired();

        // Default false so pre-existing rows get false when the column is added.
        builder.Property(c => c.IsExample).HasDefaultValue(false);

        builder.Property(c => c.Mode)
            .HasConversion(
                v => v.ToString().ToLowerInvariant(),
                v => Enum.Parse<ChartMode>(v, ignoreCase: true))
            .HasMaxLength(20);

        builder.HasIndex(c => c.IsDeleted);

        builder.HasQueryFilter(c => !c.IsDeleted);
    }
}
