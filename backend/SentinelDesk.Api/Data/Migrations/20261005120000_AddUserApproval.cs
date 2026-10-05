using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SentinelDesk.Api.Data;

#nullable disable

namespace SentinelDesk.Api.Data.Migrations;

[DbContext(typeof(SentinelDeskDbContext))]
[Migration("20261005120000_AddUserApproval")]
public partial class AddUserApproval : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "IsApproved",
            table: "Users",
            type: "boolean",
            nullable: false,
            defaultValue: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "IsApproved",
            table: "Users");
    }
}
