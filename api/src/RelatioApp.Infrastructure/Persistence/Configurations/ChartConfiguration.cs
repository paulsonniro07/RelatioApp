using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using RelatioApp.Domain.Entities;

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

        builder.Property(c => c.SortKey).HasMaxLength(20).HasDefaultValue("name");
        builder.Property(c => c.SortDir).HasMaxLength(4).HasDefaultValue("asc");

        builder.HasIndex(c => c.IsDeleted);
        builder.HasIndex(c => c.ChartTypeId);

        builder.HasOne(c => c.ChartType)
            .WithMany()
            .HasForeignKey(c => c.ChartTypeId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasQueryFilter(c => !c.IsDeleted);
    }
}
