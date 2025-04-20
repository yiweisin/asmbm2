using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SocialMediaManager.API.Migrations
{
    /// <inheritdoc />
    public partial class cc : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PlatformAccountId",
                table: "PostSubmissions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PlatformAccountId",
                table: "PostSubmissions",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }
    }
}
