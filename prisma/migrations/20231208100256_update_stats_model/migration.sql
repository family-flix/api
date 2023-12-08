-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Statistics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "drive_count" TEXT NOT NULL DEFAULT '0',
    "drive_total_size_count" TEXT NOT NULL DEFAULT '0',
    "drive_used_size_count" TEXT NOT NULL DEFAULT '0',
    "movie_count" TEXT NOT NULL DEFAULT '0',
    "season_count" TEXT NOT NULL DEFAULT '0',
    "tv_count" TEXT NOT NULL DEFAULT '0',
    "episode_count" TEXT NOT NULL DEFAULT '0',
    "sync_task_count" TEXT NOT NULL DEFAULT '0',
    "invalid_sync_task_count" TEXT NOT NULL DEFAULT '0',
    "invalid_season_count" TEXT NOT NULL DEFAULT '0',
    "report_count" TEXT NOT NULL DEFAULT '0',
    "media_request_count" TEXT NOT NULL DEFAULT '0',
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Statistics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Statistics" ("created", "drive_count", "drive_total_size_count", "drive_used_size_count", "episode_count", "id", "invalid_season_count", "invalid_sync_task_count", "movie_count", "season_count", "sync_task_count", "tv_count", "updated", "user_id") SELECT "created", "drive_count", "drive_total_size_count", "drive_used_size_count", "episode_count", "id", "invalid_season_count", "invalid_sync_task_count", "movie_count", "season_count", "sync_task_count", "tv_count", "updated", "user_id" FROM "Statistics";
DROP TABLE "Statistics";
ALTER TABLE "new_Statistics" RENAME TO "Statistics";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
