using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SocialMediaManager.API.Migrations
{
    /// <inheritdoc />
    public partial class gg : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PostSubmissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SubmitterUserId = table.Column<int>(type: "INTEGER", nullable: false),
                    AdminUserId = table.Column<int>(type: "INTEGER", nullable: false),
                    Platform = table.Column<string>(type: "TEXT", nullable: false),
                    PlatformAccountId = table.Column<int>(type: "INTEGER", nullable: false),
                    TargetId = table.Column<string>(type: "TEXT", nullable: false),
                    Content = table.Column<string>(type: "TEXT", nullable: false),
                    ScheduledTime = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: false, defaultValue: "pending"),
                    RejectionReason = table.Column<string>(type: "TEXT", nullable: false, defaultValue: ""),
                    SubmissionTime = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ReviewTime = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PostSubmissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PostSubmissions_Users_AdminUserId",
                        column: x => x.AdminUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PostSubmissions_Users_SubmitterUserId",
                        column: x => x.SubmitterUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PostSubmissions_AdminUserId",
                table: "PostSubmissions",
                column: "AdminUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PostSubmissions_SubmitterUserId",
                table: "PostSubmissions",
                column: "SubmitterUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PostSubmissions");
        }
    }
}
