/*
  Warnings:

  - You are about to drop the column `season_id` on the `TVNeedComplete` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Episode" ADD COLUMN "tip" TEXT;

-- AlterTable
ALTER TABLE "Movie" ADD COLUMN "tip" TEXT;

-- AlterTable
ALTER TABLE "Season" ADD COLUMN "tip" TEXT;

-- CreateTable
CREATE TABLE "MediaErrorNeedProcess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unique_id" TEXT NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 1,
    "profile" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "MediaErrorNeedProcess_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Statistics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "drive_count" INTEGER NOT NULL DEFAULT 0,
    "drive_total_size_count" INTEGER NOT NULL DEFAULT 0,
    "drive_used_size_count" INTEGER NOT NULL DEFAULT 0,
    "movie_count" INTEGER NOT NULL DEFAULT 0,
    "season_count" INTEGER NOT NULL DEFAULT 0,
    "tv_count" INTEGER NOT NULL DEFAULT 0,
    "episode_count" INTEGER NOT NULL DEFAULT 0,
    "sync_task_count" INTEGER NOT NULL DEFAULT 0,
    "invalid_sync_task_count" INTEGER NOT NULL DEFAULT 0,
    "invalid_season_count" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Statistics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "answer" TEXT,
    "tv_id" TEXT,
    "season_id" TEXT,
    "episode_id" TEXT,
    "movie_id" TEXT,
    "member_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Report_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Report_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Report" ("answer", "created", "data", "episode_id", "id", "member_id", "movie_id", "season_id", "tv_id", "type", "updated", "user_id") SELECT "answer", "created", "data", "episode_id", "id", "member_id", "movie_id", "season_id", "tv_id", "type", "updated", "user_id" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
CREATE TABLE "new_TVNeedComplete" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "episode_count" INTEGER DEFAULT 0,
    "cur_count" INTEGER DEFAULT 0,
    "text" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "TVNeedComplete_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TVNeedComplete" ("created", "cur_count", "episode_count", "id", "text", "updated", "user_id") SELECT "created", "cur_count", "episode_count", "id", "text", "updated", "user_id" FROM "TVNeedComplete";
DROP TABLE "TVNeedComplete";
ALTER TABLE "new_TVNeedComplete" RENAME TO "TVNeedComplete";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
