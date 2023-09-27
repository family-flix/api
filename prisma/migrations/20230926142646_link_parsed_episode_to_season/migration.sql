-- AlterTable
ALTER TABLE "Drive" ADD COLUMN "hidden" INTEGER DEFAULT 0;
ALTER TABLE "Drive" ADD COLUMN "order" INTEGER DEFAULT 0;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "type" INTEGER NOT NULL DEFAULT 0,
    "rules" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "hidden" INTEGER NOT NULL DEFAULT 0,
    "styles" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Collection_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Collection" ("created", "desc", "id", "rules", "sort", "styles", "title", "type", "updated", "user_id") SELECT "created", "desc", "id", "rules", "sort", "styles", "title", "type", "updated", "user_id" FROM "Collection";
DROP TABLE "Collection";
ALTER TABLE "new_Collection" RENAME TO "Collection";
CREATE TABLE "new_Movie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "collection_id" TEXT,
    CONSTRAINT "Movie_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "movie_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Movie_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Movie_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "Collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Movie" ("collection_id", "created", "id", "profile_id", "updated", "user_id") SELECT "collection_id", "created", "id", "profile_id", "updated", "user_id" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
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
    "parsed_season_id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedEpisode_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParsedEpisode_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParsedEpisode_parsed_tv_id_fkey" FOREIGN KEY ("parsed_tv_id") REFERENCES "ParsedTV" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ParsedEpisode_parsed_season_id_fkey" FOREIGN KEY ("parsed_season_id") REFERENCES "ParsedSeason" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ParsedEpisode_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedEpisode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ParsedEpisode" ("can_search", "created", "drive_id", "episode_id", "episode_number", "file_id", "file_name", "id", "md5", "name", "parent_file_id", "parent_paths", "parsed_season_id", "parsed_tv_id", "season_id", "season_number", "size", "type", "updated", "user_id") SELECT p."can_search", p."created", p."drive_id", p."episode_id", p."episode_number", p."file_id", p."file_name", p."id", p."md5", p."name", p."parent_file_id", p."parent_paths", p."parsed_season_id", p."parsed_tv_id", e."season_id", p."season_number", p."size", p."type", p."updated", p."user_id" FROM "ParsedEpisode" p LEFT JOIN "Episode" e ON p."episode_id" = e."id";
DROP TABLE "ParsedEpisode";
ALTER TABLE "new_ParsedEpisode" RENAME TO "ParsedEpisode";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
