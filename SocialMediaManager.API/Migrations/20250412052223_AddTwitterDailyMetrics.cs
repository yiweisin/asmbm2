using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SocialMediaManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTwitterDailyMetrics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TwitterDailyMetrics",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TwitterAccountId = table.Column<int>(type: "INTEGER", nullable: false),
                    RecordedDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    FollowerCount = table.Column<int>(type: "INTEGER", nullable: false),
                    TotalLikes = table.Column<int>(type: "INTEGER", nullable: false),
                    TotalViews = table.Column<int>(type: "INTEGER", nullable: false),
                    TweetCount = table.Column<int>(type: "INTEGER", nullable: false),
                    RetweetCount = table.Column<int>(type: "INTEGER", nullable: false),
                    ReplyCount = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TwitterDailyMetrics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TwitterDailyMetrics_TwitterAccounts_TwitterAccountId",
                        column: x => x.TwitterAccountId,
                        principalTable: "TwitterAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TwitterDailyMetrics_TwitterAccountId",
                table: "TwitterDailyMetrics",
                column: "TwitterAccountId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TwitterDailyMetrics");
        }
    }
}
