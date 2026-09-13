using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RelatioApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddChartTypeUsesLevels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "UsesLevels",
                table: "ChartTypes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // The Organization starter preset keeps its rank/tier field; the
            // Family and School presets leave it off.
            migrationBuilder.Sql(
                @"UPDATE ""ChartTypes"" SET ""UsesLevels"" = true WHERE ""Name"" = 'Organization';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UsesLevels",
                table: "ChartTypes");
        }
    }
}
