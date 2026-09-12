using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using RelatioApp.Domain.Entities;

namespace RelatioApp.Infrastructure.Persistence.Configurations;

public class RelationshipTypeDefinitionConfiguration
    : IEntityTypeConfiguration<RelationshipTypeDefinition>
{
    public void Configure(EntityTypeBuilder<RelationshipTypeDefinition> builder)
    {
        builder.ToTable("RelationshipTypeDefinitions");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.TypeId).HasMaxLength(100).IsRequired();
        builder.Property(r => r.Label).HasMaxLength(200).IsRequired();
        builder.Property(r => r.ForwardLabel).HasMaxLength(200).IsRequired();
        builder.Property(r => r.BackwardLabel).HasMaxLength(200).IsRequired();
        builder.Property(r => r.Icon).HasMaxLength(50);
        builder.Property(r => r.Link).HasMaxLength(30).IsRequired();

        builder.HasIndex(r => r.ChartTypeId);
        builder.HasIndex(r => r.IsDeleted);

        builder.HasQueryFilter(r => !r.IsDeleted);
    }
}
