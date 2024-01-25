/*
  Warnings:

  - You are about to drop the column `drive_count` on the `Statistics` table. All the data in the column will be lost.
  - You are about to drop the column `drive_total_size_count` on the `Statistics` table. All the data in the column will be lost.
  - You are about to drop the column `drive_used_size_count` on the `Statistics` table. All the data in the column will be lost.
  - You are about to drop the column `episode_count` on the `Statistics` table. All the data in the column will be lost.
  - You are about to drop the column `invalid_season_count` on the `Statistics` table. All the data in the column will be lost.
  - You are about to drop the column `invalid_sync_task_count` on the `Statistics` table. All the data in the column will be lost.
  - You are about to drop the column `media_request_count` on the `Statistics` table. All the data in the column will be lost.
  - You are about to drop the column `movie_count` on the `Statistics` table. All the data in the column will be lost.
  - You are about to drop the column `report_count` on the `Statistics` table. All the data in the column will be lost.
  - You are about to drop the column `season_count` on the `Statistics` table. All the data in the column will be lost.
  - You are about to drop the column `sync_task_count` on the `Statistics` table. All the data in the column will be lost.
  - You are about to drop the column `tv_count` on the `Statistics` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SharedFile" ADD COLUMN "pwd" TEXT;

-- AlterTable
ALTER TABLE "SharedFileInProgress" ADD COLUMN "pwd" TEXT;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Statistics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" TEXT NOT NULL DEFAULT '{}',
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Statistics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Statistics" ("created", "id", "updated", "user_id") SELECT "created", "id", "updated", "user_id" FROM "Statistics";
DROP TABLE "Statistics";
ALTER TABLE "new_Statistics" RENAME TO "Statistics";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
