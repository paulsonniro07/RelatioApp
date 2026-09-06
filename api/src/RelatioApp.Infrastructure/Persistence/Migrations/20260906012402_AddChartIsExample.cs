using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RelatioApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddChartIsExample : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsExample",
                table: "Charts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Backfill: charts previously created via the old "load sample"
            // buttons used the canonical example names — mark them as examples
            // so the client does not seed duplicates next load.
            migrationBuilder.Sql(
                """
                UPDATE "Charts"
                SET "IsExample" = true
                WHERE "Name" IN ('Acme Org Chart', 'Rivera Family Tree')
                  AND "IsDeleted" = false;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "Charts"
                SET "IsExample" = false
                WHERE "Name" IN ('Acme Org Chart', 'Rivera Family Tree');
                """);

            migrationBuilder.DropColumn(
                name: "IsExample",
                table: "Charts");
        }
    }
}
