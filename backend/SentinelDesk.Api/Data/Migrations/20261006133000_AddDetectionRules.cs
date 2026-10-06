using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SentinelDesk.Api.Data;

#nullable disable

namespace SentinelDesk.Api.Data.Migrations;

[DbContext(typeof(SentinelDeskDbContext))]
[Migration("20261006133000_AddDetectionRules")]
public partial class AddDetectionRules : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "DetectionRules",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                RuleKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                IsEnabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                Severity = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                TriggerCount = table.Column<int>(type: "integer", nullable: false),
                WindowMinutes = table.Column<int>(type: "integer", nullable: false),
                RiskScore = table.Column<int>(type: "integer", nullable: false),
                MatchPatterns = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_DetectionRules", x => x.Id));

        migrationBuilder.CreateIndex(
            name: "IX_DetectionRules_RuleKey",
            table: "DetectionRules",
            column: "RuleKey",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.DropTable(name: "DetectionRules");
}
