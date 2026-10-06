using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SentinelDesk.Api.Data;

#nullable disable

namespace SentinelDesk.Api.Data.Migrations;

[DbContext(typeof(SentinelDeskDbContext))]
[Migration("20261006130000_AddEndpointInventory")]
public partial class AddEndpointInventory : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Endpoints",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                ComputerName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                OsName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                OsVersion = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                AgentVersion = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                LastIpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                IsEnabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                FirstSeenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                LastSeenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                LastEventAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Endpoints", x => x.Id);
            });

        migrationBuilder.AddColumn<Guid>(
            name: "EndpointId",
            table: "SecurityEvents",
            type: "uuid",
            nullable: true);

        migrationBuilder.AddColumn<Guid>(
            name: "EndpointId",
            table: "Incidents",
            type: "uuid",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_Endpoints_ComputerName",
            table: "Endpoints",
            column: "ComputerName",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Endpoints_LastSeenAt",
            table: "Endpoints",
            column: "LastSeenAt");

        migrationBuilder.CreateIndex(
            name: "IX_SecurityEvents_EndpointId",
            table: "SecurityEvents",
            column: "EndpointId");

        migrationBuilder.CreateIndex(
            name: "IX_Incidents_EndpointId",
            table: "Incidents",
            column: "EndpointId");

        migrationBuilder.AddForeignKey(
            name: "FK_Incidents_Endpoints_EndpointId",
            table: "Incidents",
            column: "EndpointId",
            principalTable: "Endpoints",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);

        migrationBuilder.AddForeignKey(
            name: "FK_SecurityEvents_Endpoints_EndpointId",
            table: "SecurityEvents",
            column: "EndpointId",
            principalTable: "Endpoints",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(name: "FK_Incidents_Endpoints_EndpointId", table: "Incidents");
        migrationBuilder.DropForeignKey(name: "FK_SecurityEvents_Endpoints_EndpointId", table: "SecurityEvents");
        migrationBuilder.DropIndex(name: "IX_Incidents_EndpointId", table: "Incidents");
        migrationBuilder.DropIndex(name: "IX_SecurityEvents_EndpointId", table: "SecurityEvents");
        migrationBuilder.DropColumn(name: "EndpointId", table: "Incidents");
        migrationBuilder.DropColumn(name: "EndpointId", table: "SecurityEvents");
        migrationBuilder.DropTable(name: "Endpoints");
    }
}
