using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RelatioApp.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class GeneralizeRelationshipModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RelationshipTypeId",
                table: "TreeNodes",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ChartTypeId",
                table: "Charts",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ChartTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IsExample = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChartTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RelationshipTypeDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChartTypeId = table.Column<Guid>(type: "uuid", nullable: false),
                    TypeId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ForwardLabel = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackwardLabel = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Icon = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Directional = table.Column<bool>(type: "boolean", nullable: false),
                    Link = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RelationshipTypeDefinitions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RelationshipTypeDefinitions_ChartTypes_ChartTypeId",
                        column: x => x.ChartTypeId,
                        principalTable: "ChartTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TreeNodes_RelationshipTypeId",
                table: "TreeNodes",
                column: "RelationshipTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_Charts_ChartTypeId",
                table: "Charts",
                column: "ChartTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_ChartTypes_IsDeleted",
                table: "ChartTypes",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_RelationshipTypeDefinitions_ChartTypeId",
                table: "RelationshipTypeDefinitions",
                column: "ChartTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_RelationshipTypeDefinitions_IsDeleted",
                table: "RelationshipTypeDefinitions",
                column: "IsDeleted");

            migrationBuilder.AddForeignKey(
                name: "FK_Charts_ChartTypes_ChartTypeId",
                table: "Charts",
                column: "ChartTypeId",
                principalTable: "ChartTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // --- Data migration: seed starter presets and backfill existing charts. ---
            migrationBuilder.Sql(@"
INSERT INTO ""ChartTypes"" (""Id"",""Name"",""IsExample"",""IsDeleted"",""CreatedAt"",""UpdatedAt"") VALUES
 ('11111111-1111-1111-1111-111111111111','Family',true,false,now(),now()),
 ('22222222-2222-2222-2222-222222222222','Organization',true,false,now(),now()),
 ('33333333-3333-3333-3333-333333333333','School',true,false,now(),now())
ON CONFLICT (""Id"") DO NOTHING;

INSERT INTO ""RelationshipTypeDefinitions"" (""Id"",""ChartTypeId"",""TypeId"",""Label"",""ForwardLabel"",""BackwardLabel"",""Icon"",""Directional"",""Link"",""IsDeleted"",""CreatedAt"",""UpdatedAt"") VALUES
 ('a0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','parent-child','Parent / Child','Parent','Child','user',true,'parent',false,now(),now()),
 ('a0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','spouse','Spouse','Spouse','Spouse','heart',false,'partner',false,now(),now()),
 ('a0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','sibling','Sibling','Sibling','Sibling','users',false,'shared-parent',false,now(),now()),
 ('b0000000-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','manager-report','Manager / Report','Manager','Report','briefcase',true,'parent',false,now(),now()),
 ('b0000000-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','peer','Peer / Colleague','Peer','Colleague','users',false,'partner',false,now(),now()),
 ('c0000000-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','teacher-student','Teacher / Student','Teacher','Student','star',true,'parent',false,now(),now()),
 ('c0000000-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','classmate','Classmate','Classmate','Classmate','users',false,'partner',false,now(),now()),
 ('c0000000-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','mentor-mentee','Mentor / Mentee','Mentor','Mentee','star',true,'parent',false,now(),now())
ON CONFLICT (""Id"") DO NOTHING;

UPDATE ""Charts"" SET ""ChartTypeId"" = '11111111-1111-1111-1111-111111111111' WHERE ""Mode"" = 'family';
UPDATE ""Charts"" SET ""ChartTypeId"" = '22222222-2222-2222-2222-222222222222' WHERE ""Mode"" = 'org';
");

            // Now that existing rows are migrated, the legacy column is safe to drop.
            migrationBuilder.DropColumn(
                name: "Mode",
                table: "Charts");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Charts_ChartTypes_ChartTypeId",
                table: "Charts");

            migrationBuilder.DropTable(
                name: "RelationshipTypeDefinitions");

            migrationBuilder.DropTable(
                name: "ChartTypes");

            migrationBuilder.DropIndex(
                name: "IX_TreeNodes_RelationshipTypeId",
                table: "TreeNodes");

            migrationBuilder.DropIndex(
                name: "IX_Charts_ChartTypeId",
                table: "Charts");

            migrationBuilder.DropColumn(
                name: "RelationshipTypeId",
                table: "TreeNodes");

            migrationBuilder.DropColumn(
                name: "ChartTypeId",
                table: "Charts");

            migrationBuilder.AddColumn<string>(
                name: "Mode",
                table: "Charts",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");
        }
    }
}
