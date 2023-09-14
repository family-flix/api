/*
  Warnings:

  - You are about to drop the column `parsed_tv_id` on the `BindForParsedTV` table. All the data in the column will be lost.
  - Added the required column `file_id_link_resource` to the `BindForParsedTV` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SeasonProfile" ADD COLUMN "vote_average" REAL DEFAULT 0;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlayHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" REAL DEFAULT 0,
    "current_time" REAL DEFAULT 0,
    "thumbnail" TEXT,
    "file_id" TEXT,
    "tv_id" TEXT,
    "season_id" TEXT,
    "episode_id" TEXT,
    "movie_id" TEXT,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "PlayHistory_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayHistory_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PlayHistory_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PlayHistory_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayHistory_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PlayHistory" ("created", "current_time", "duration", "episode_id", "season_id", "file_id", "id", "member_id", "movie_id", "thumbnail", "tv_id", "updated") SELECT p."created", p."current_time", p."duration", p."episode_id", e."season_id", p."file_id", p."id", p."member_id", p."movie_id", p."thumbnail", p."tv_id", p."updated" FROM "PlayHistory" p LEFT JOIN "Episode" e ON p."episode_id" = e."id";
DROP TABLE "PlayHistory";
ALTER TABLE "new_PlayHistory" RENAME TO "PlayHistory";
CREATE TABLE "new_BindForParsedTV" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_id_link_resource" TEXT NOT NULL,
    "file_name_link_resource" TEXT NOT NULL,
    "in_production" INTEGER DEFAULT 1,
    "invalid" INTEGER DEFAULT 0,
    "season_id" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "BindForParsedTV_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BindForParsedTV_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BindForParsedTV_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BindForParsedTV" ("created", "drive_id", "file_id", "file_id_link_resource", "file_name_link_resource", "id", "in_production", "invalid", "name", "updated", "url", "user_id") SELECT b."created", p."drive_id", b."file_id", p."file_id", p."file_name", b."id", b."in_production", b."invalid", b."name", b."updated", b."url", b."user_id" FROM "BindForParsedTV" b LEFT JOIN "ParsedTV" p ON p."id" = b."parsed_tv_id";
DROP TABLE "BindForParsedTV";
ALTER TABLE "new_BindForParsedTV" RENAME TO "BindForParsedTV";
CREATE TABLE "new_Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "type" INTEGER NOT NULL DEFAULT 0,
    "rules" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "styles" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Collection_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Collection" ("created", "desc", "id", "title", "updated", "user_id") SELECT "created", "desc", "id", "title", "updated", "user_id" FROM "Collection";
DROP TABLE "Collection";
ALTER TABLE "new_Collection" RENAME TO "Collection";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
