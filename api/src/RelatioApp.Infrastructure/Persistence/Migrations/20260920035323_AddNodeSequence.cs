using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RelatioApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNodeSequence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Sequence",
                table: "TreeNodes",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Sequence",
                table: "TreeNodes");
        }
    }
}
