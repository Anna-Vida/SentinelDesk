using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SentinelDesk.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIncidentManagementAndSecurityEventLinking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "IncidentId",
                table: "SecurityEvents",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ArchivedAt",
                table: "Incidents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsArchived",
                table: "Incidents",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_SecurityEvents_DetectedAt",
                table: "SecurityEvents",
                column: "DetectedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SecurityEvents_IncidentId",
                table: "SecurityEvents",
                column: "IncidentId");

            migrationBuilder.CreateIndex(
                name: "IX_Incidents_CreatedAt",
                table: "Incidents",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Incidents_IsArchived",
                table: "Incidents",
                column: "IsArchived");

            migrationBuilder.CreateIndex(
                name: "IX_Incidents_Severity",
                table: "Incidents",
                column: "Severity");

            migrationBuilder.CreateIndex(
                name: "IX_Incidents_Status",
                table: "Incidents",
                column: "Status");

            migrationBuilder.AddForeignKey(
                name: "FK_SecurityEvents_Incidents_IncidentId",
                table: "SecurityEvents",
                column: "IncidentId",
                principalTable: "Incidents",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SecurityEvents_Incidents_IncidentId",
                table: "SecurityEvents");

            migrationBuilder.DropIndex(
                name: "IX_SecurityEvents_DetectedAt",
                table: "SecurityEvents");

            migrationBuilder.DropIndex(
                name: "IX_SecurityEvents_IncidentId",
                table: "SecurityEvents");

            migrationBuilder.DropIndex(
                name: "IX_Incidents_CreatedAt",
                table: "Incidents");

            migrationBuilder.DropIndex(
                name: "IX_Incidents_IsArchived",
                table: "Incidents");

            migrationBuilder.DropIndex(
                name: "IX_Incidents_Severity",
                table: "Incidents");

            migrationBuilder.DropIndex(
                name: "IX_Incidents_Status",
                table: "Incidents");

            migrationBuilder.DropColumn(
                name: "IncidentId",
                table: "SecurityEvents");

            migrationBuilder.DropColumn(
                name: "ArchivedAt",
                table: "Incidents");

            migrationBuilder.DropColumn(
                name: "IsArchived",
                table: "Incidents");
        }
    }
}
