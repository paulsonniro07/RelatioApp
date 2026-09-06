using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using RelatioApp.Domain.Entities;

namespace RelatioApp.Infrastructure.Persistence.Configurations;

public class TreeNodeConfiguration : IEntityTypeConfiguration<TreeNode>
{
    public void Configure(EntityTypeBuilder<TreeNode> builder)
    {
        builder.ToTable("TreeNodes");

        builder.HasKey(n => n.Id);

        builder.Property(n => n.Name).HasMaxLength(200).IsRequired();
        builder.Property(n => n.Level).HasMaxLength(100);
        builder.Property(n => n.RoleOrRelationship).HasMaxLength(200);
        builder.Property(n => n.PhotoUrl).HasMaxLength(500);

        builder.HasIndex(n => n.ChartId);
        builder.HasIndex(n => n.ParentId);
        builder.HasIndex(n => n.PartnerId);
        builder.HasIndex(n => n.IsDeleted);

        builder.HasOne(n => n.Chart)
            .WithMany(c => c.Nodes)
            .HasForeignKey(n => n.ChartId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(n => n.Parent)
            .WithMany(n => n.Children)
            .HasForeignKey(n => n.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(n => n.Partner)
            .WithMany()
            .HasForeignKey(n => n.PartnerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(n => !n.IsDeleted);
    }
}
