/*
  Warnings:

  - Added the required column `name` to the `subtitle` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_subtitle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "movie_id" TEXT,
    "episode_id" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "subtitle_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "subtitle_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "subtitle_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subtitle_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_subtitle" ("created", "drive_id", "episode_id", "file_id", "id", "language", "movie_id", "updated", "user_id") SELECT "created", "drive_id", "episode_id", "file_id", "id", "language", "movie_id", "updated", "user_id" FROM "subtitle";
DROP TABLE "subtitle";
ALTER TABLE "new_subtitle" RENAME TO "subtitle";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
