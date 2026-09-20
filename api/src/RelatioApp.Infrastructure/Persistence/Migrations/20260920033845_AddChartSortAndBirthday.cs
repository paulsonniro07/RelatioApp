using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RelatioApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddChartSortAndBirthday : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "BirthDate",
                table: "TreeNodes",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SortDir",
                table: "Charts",
                type: "character varying(4)",
                maxLength: 4,
                nullable: false,
                defaultValue: "asc");

            migrationBuilder.AddColumn<string>(
                name: "SortKey",
                table: "Charts",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "name");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BirthDate",
                table: "TreeNodes");

            migrationBuilder.DropColumn(
                name: "SortDir",
                table: "Charts");

            migrationBuilder.DropColumn(
                name: "SortKey",
                table: "Charts");
        }
    }
}
