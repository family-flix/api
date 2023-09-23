-- DropIndex
DROP INDEX "Episode_user_id_profile_id_key";

-- DropIndex
DROP INDEX "Movie_user_id_profile_id_key";

-- DropIndex
DROP INDEX "Season_user_id_profile_id_key";

-- DropIndex
DROP INDEX "TV_user_id_profile_id_key";

-- RedefineTables
PRAGMA foreign_keys=OFF;
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
    "episode_id" TEXT,
    "parsed_tv_id" TEXT NOT NULL,
    "parsed_season_id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedEpisode_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParsedEpisode_parsed_tv_id_fkey" FOREIGN KEY ("parsed_tv_id") REFERENCES "ParsedTV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedEpisode_parsed_season_id_fkey" FOREIGN KEY ("parsed_season_id") REFERENCES "ParsedSeason" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ParsedEpisode_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedEpisode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ParsedEpisode" ("can_search", "created", "drive_id", "episode_id", "episode_number", "file_id", "file_name", "id", "md5", "name", "parent_file_id", "parent_paths", "parsed_season_id", "parsed_tv_id", "season_number", "size", "type", "updated", "user_id") SELECT "can_search", "created", "drive_id", "episode_id", "episode_number", "file_id", "file_name", "id", "md5", "name", "parent_file_id", "parent_paths", "parsed_season_id", "parsed_tv_id", "season_number", "size", "type", "updated", "user_id" FROM "ParsedEpisode";
DROP TABLE "ParsedEpisode";
ALTER TABLE "new_ParsedEpisode" RENAME TO "ParsedEpisode";
CREATE TABLE "new_ParsedMovie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "original_name" TEXT,
    "correct_name" TEXT,
    "file_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "parent_file_id" TEXT NOT NULL,
    "parent_paths" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "size" REAL DEFAULT 0,
    "can_search" INTEGER DEFAULT 1,
    "movie_id" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedMovie_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParsedMovie_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedMovie_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ParsedMovie" ("can_search", "correct_name", "created", "drive_id", "file_id", "file_name", "id", "movie_id", "name", "original_name", "parent_file_id", "parent_paths", "size", "type", "updated", "user_id") SELECT "can_search", "correct_name", "created", "drive_id", "file_id", "file_name", "id", "movie_id", "name", "original_name", "parent_file_id", "parent_paths", "size", "type", "updated", "user_id" FROM "ParsedMovie";
DROP TABLE "ParsedMovie";
ALTER TABLE "new_ParsedMovie" RENAME TO "ParsedMovie";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
