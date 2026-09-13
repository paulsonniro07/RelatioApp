using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using RelatioApp.Domain.Entities;

namespace RelatioApp.Infrastructure.Persistence.Configurations;

public class ChartTypeConfiguration : IEntityTypeConfiguration<ChartType>
{
    public void Configure(EntityTypeBuilder<ChartType> builder)
    {
        builder.ToTable("ChartTypes");

        builder.HasKey(ct => ct.Id);

        builder.Property(ct => ct.Name).HasMaxLength(200).IsRequired();
        builder.Property(ct => ct.UsesLevels).HasDefaultValue(false);
        builder.Property(ct => ct.IsExample).HasDefaultValue(false);

        builder.HasIndex(ct => ct.IsDeleted);

        builder.HasMany(ct => ct.Relationships)
            .WithOne(r => r.ChartType)
            .HasForeignKey(r => r.ChartTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(ct => !ct.IsDeleted);
    }
}
