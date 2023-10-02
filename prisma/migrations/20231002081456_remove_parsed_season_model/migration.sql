/*
  Warnings:

  - You are about to drop the column `correct_season_number` on the `ParsedSeason` table. All the data in the column will be lost.
  - You are about to drop the column `correct_name` on the `ParsedMovie` table. All the data in the column will be lost.
  - You are about to drop the column `correct_name` on the `ParsedTV` table. All the data in the column will be lost.
  - You are about to drop the column `tmdb_id` on the `ParsedTV` table. All the data in the column will be lost.
  - You are about to drop the column `parsed_season_id` on the `ParsedEpisode` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ParsedSeason" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "season_number" TEXT NOT NULL,
    "file_id" TEXT,
    "file_name" TEXT,
    "can_search" INTEGER DEFAULT 1,
    "season_id" TEXT,
    "parsed_tv_id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedSeason_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParsedSeason_parsed_tv_id_fkey" FOREIGN KEY ("parsed_tv_id") REFERENCES "ParsedTV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedSeason_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedSeason_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ParsedSeason" ("can_search", "created", "drive_id", "file_id", "file_name", "id", "parsed_tv_id", "season_id", "season_number", "updated", "user_id") SELECT "can_search", "created", "drive_id", "file_id", "file_name", "id", "parsed_tv_id", "season_id", "season_number", "updated", "user_id" FROM "ParsedSeason";
DROP TABLE "ParsedSeason";
ALTER TABLE "new_ParsedSeason" RENAME TO "ParsedSeason";
CREATE TABLE "new_ParsedMovie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "original_name" TEXT,
    "file_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "parent_file_id" TEXT NOT NULL,
    "parent_paths" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "size" REAL DEFAULT 0,
    "can_search" INTEGER DEFAULT 1,
    "source" INTEGER DEFAULT 0,
    "unique_id" TEXT,
    "movie_id" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedMovie_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParsedMovie_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedMovie_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ParsedMovie" ("can_search", "created", "drive_id", "file_id", "file_name", "id", "movie_id", "name", "original_name", "parent_file_id", "parent_paths", "size", "type", "updated", "user_id") SELECT "can_search", "created", "drive_id", "file_id", "file_name", "id", "movie_id", "name", "original_name", "parent_file_id", "parent_paths", "size", "type", "updated", "user_id" FROM "ParsedMovie";
DROP TABLE "ParsedMovie";
ALTER TABLE "new_ParsedMovie" RENAME TO "ParsedMovie";
CREATE TABLE "new_ParsedTV" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "original_name" TEXT,
    "file_id" TEXT,
    "file_name" TEXT,
    "can_search" INTEGER DEFAULT 1,
    "source" INTEGER DEFAULT 0,
    "unique_id" TEXT,
    "tv_id" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedTV_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParsedTV_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedTV_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ParsedTV" ("can_search", "created", "drive_id", "file_id", "file_name", "id", "name", "original_name", "tv_id", "updated", "user_id") SELECT "can_search", "created", "drive_id", "file_id", "file_name", "id", "name", "original_name", "tv_id", "updated", "user_id" FROM "ParsedTV";
DROP TABLE "ParsedTV";
ALTER TABLE "new_ParsedTV" RENAME TO "ParsedTV";
CREATE TABLE "new_ParsedEpisode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "episode_number" TEXT NOT NULL,
    "season_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "parent_file_id" TEXT NOT NULL,
    "parent_paths" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "size" REAL DEFAULT 0,
    "can_search" INTEGER DEFAULT 1,
    "md5" TEXT,
    "season_id" TEXT,
    "episode_id" TEXT,
    "parsed_tv_id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedEpisode_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParsedEpisode_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParsedEpisode_parsed_tv_id_fkey" FOREIGN KEY ("parsed_tv_id") REFERENCES "ParsedTV" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ParsedEpisode_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedEpisode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ParsedEpisode" ("can_search", "created", "drive_id", "episode_id", "episode_number", "file_id", "file_name", "id", "md5", "name", "parent_file_id", "parent_paths", "parsed_tv_id", "season_id", "season_number", "size", "type", "updated", "user_id") SELECT "can_search", "created", "drive_id", "episode_id", "episode_number", "file_id", "file_name", "id", "md5", "name", "parent_file_id", "parent_paths", "parsed_tv_id", "season_id", "season_number", "size", "type", "updated", "user_id" FROM "ParsedEpisode";
DROP TABLE "ParsedEpisode";
ALTER TABLE "new_ParsedEpisode" RENAME TO "ParsedEpisode";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
