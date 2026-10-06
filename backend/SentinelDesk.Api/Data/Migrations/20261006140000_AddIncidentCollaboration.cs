using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SentinelDesk.Api.Data;

#nullable disable

namespace SentinelDesk.Api.Data.Migrations;

[DbContext(typeof(SentinelDeskDbContext))]
[Migration("20261006140000_AddIncidentCollaboration")]
public partial class AddIncidentCollaboration : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<Guid>(
            name: "AssignedToUserId",
            table: "Incidents",
            type: "uuid",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "AssignedToDisplayName",
            table: "Incidents",
            type: "character varying(100)",
            maxLength: 100,
            nullable: true);

        migrationBuilder.CreateTable(
            name: "IncidentActivities",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                IncidentId = table.Column<Guid>(type: "uuid", nullable: false),
                ActivityType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                Message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                ActorUserId = table.Column<Guid>(type: "uuid", nullable: true),
                ActorDisplayName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_IncidentActivities", x => x.Id);
                table.ForeignKey(
                    name: "FK_IncidentActivities_Incidents_IncidentId",
                    column: x => x.IncidentId,
                    principalTable: "Incidents",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_Incidents_AssignedToUserId",
            table: "Incidents",
            column: "AssignedToUserId");

        migrationBuilder.CreateIndex(
            name: "IX_IncidentActivities_IncidentId",
            table: "IncidentActivities",
            column: "IncidentId");

        migrationBuilder.CreateIndex(
            name: "IX_IncidentActivities_CreatedAt",
            table: "IncidentActivities",
            column: "CreatedAt");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "IncidentActivities");
        migrationBuilder.DropIndex(name: "IX_Incidents_AssignedToUserId", table: "Incidents");
        migrationBuilder.DropColumn(name: "AssignedToUserId", table: "Incidents");
        migrationBuilder.DropColumn(name: "AssignedToDisplayName", table: "Incidents");
    }
}
