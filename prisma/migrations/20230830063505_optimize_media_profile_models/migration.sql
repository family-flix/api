/*
  Warnings:

  - You are about to drop the `RecommendedTV` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `collection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `tmdb_id` on the `SeasonProfile` table. All the data in the column will be lost.
  - You are about to drop the column `tmdb_id` on the `episode_profile` table. All the data in the column will be lost.
  - You are about to drop the column `tmdb_id` on the `movie_profile` table. All the data in the column will be lost.
  - You are about to drop the column `tmdb_id` on the `TVProfile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id,profile_id]` on the table `Episode` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `unique_id` to the `SeasonProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unique_id` to the `episode_profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unique_id` to the `movie_profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unique_id` to the `TVProfile` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Episode_profile_id_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RecommendedTV";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "collection";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Collection_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Movie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "collection_id" TEXT,
    CONSTRAINT "Movie_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "movie_profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Movie_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Movie_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "Collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Movie" ("collection_id", "created", "id", "profile_id", "updated", "user_id") SELECT "collection_id", "created", "id", "profile_id", "updated", "user_id" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE UNIQUE INDEX "Movie_user_id_profile_id_key" ON "Movie"("user_id", "profile_id");
CREATE TABLE "new_SeasonProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unique_id" TEXT NOT NULL,
    "source" INTEGER DEFAULT 0,
    "sources" TEXT DEFAULT '',
    "name" TEXT,
    "overview" TEXT,
    "poster_path" TEXT,
    "season_number" INTEGER,
    "air_date" TEXT,
    "episode_count" INTEGER DEFAULT 0
);
INSERT INTO "new_SeasonProfile" ("air_date", "created", "episode_count", "id", "name", "overview", "poster_path", "season_number", "source", "sources", "updated", "unique_id") SELECT "air_date", "created", "episode_count", "id", "name", "overview", "poster_path", "season_number", 1, json_object('tmdb_id', "tmdb_id"), "updated", CAST("tmdb_id" AS TEXT) FROM "SeasonProfile";
DROP TABLE "SeasonProfile";
ALTER TABLE "new_SeasonProfile" RENAME TO "SeasonProfile";
CREATE TABLE "new_episode_profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unique_id" TEXT NOT NULL,
    "source" INTEGER DEFAULT 0,
    "sources" TEXT DEFAULT '',
    "name" TEXT,
    "overview" TEXT,
    "air_date" TEXT,
    "runtime" INTEGER DEFAULT 0
);
INSERT INTO "new_episode_profile" ("air_date", "created", "id", "name", "overview", "runtime", "source", "sources", "updated", "unique_id") SELECT "air_date", "created", "id", "name", "overview", "runtime", 1, json_object('tmdb_id', "tmdb_id"), "updated", CAST("tmdb_id" AS TEXT) FROM "episode_profile";
DROP TABLE "episode_profile";
ALTER TABLE "new_episode_profile" RENAME TO "episode_profile";
CREATE TABLE "new_movie_profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unique_id" TEXT NOT NULL,
    "source" INTEGER DEFAULT 0,
    "sources" TEXT DEFAULT '',
    "name" TEXT,
    "original_name" TEXT,
    "overview" TEXT,
    "poster_path" TEXT,
    "backdrop_path" TEXT,
    "air_date" TEXT,
    "original_language" TEXT,
    "popularity" REAL DEFAULT 0,
    "vote_average" REAL DEFAULT 0,
    "vote_count" REAL DEFAULT 0,
    "origin_country" TEXT DEFAULT '',
    "genres" TEXT DEFAULT '',
    "runtime" INTEGER DEFAULT 0
);
INSERT INTO "new_movie_profile" ("air_date", "backdrop_path", "created", "genres", "id", "name", "origin_country", "original_language", "original_name", "overview", "popularity", "poster_path", "runtime", "source", "sources", "updated", "unique_id", "vote_average", "vote_count") SELECT "air_date", "backdrop_path", "created", "genres", "id", "name", "origin_country", "original_language", "original_name", "overview", "popularity", "poster_path", "runtime", 1, json_object('tmdb_id', "tmdb_id"), "updated", CAST("tmdb_id" AS TEXT), "vote_average", "vote_count" FROM "movie_profile";
DROP TABLE "movie_profile";
ALTER TABLE "new_movie_profile" RENAME TO "movie_profile";
CREATE TABLE "new_Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "season_text" TEXT NOT NULL,
    "season_number" INTEGER NOT NULL,
    "profile_id" TEXT NOT NULL,
    "collection_id" TEXT,
    "tv_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Season_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "SeasonProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Season_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "Collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Season_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Season_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Season" ("collection_id", "created", "id", "profile_id", "season_number", "season_text", "tv_id", "updated", "user_id") SELECT "collection_id", "created", "id", "profile_id", "season_number", "season_text", "tv_id", "updated", "user_id" FROM "Season";
DROP TABLE "Season";
ALTER TABLE "new_Season" RENAME TO "Season";
CREATE UNIQUE INDEX "Season_user_id_profile_id_key" ON "Season"("user_id", "profile_id");
CREATE TABLE "new_TVProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unique_id" TEXT NOT NULL,
    "source" INTEGER DEFAULT 0,
    "sources" TEXT DEFAULT '',
    "name" TEXT,
    "original_name" TEXT,
    "overview" TEXT,
    "poster_path" TEXT,
    "backdrop_path" TEXT,
    "first_air_date" TEXT,
    "original_language" TEXT,
    "origin_country" TEXT DEFAULT '',
    "genres" TEXT DEFAULT '',
    "popularity" REAL DEFAULT 0,
    "vote_average" REAL DEFAULT 0,
    "vote_count" REAL DEFAULT 0,
    "episode_count" INTEGER DEFAULT 0,
    "season_count" INTEGER DEFAULT 0,
    "status" TEXT,
    "in_production" INTEGER DEFAULT 0
);
INSERT INTO "new_TVProfile" ("backdrop_path", "created", "episode_count", "first_air_date", "genres", "id", "in_production", "name", "origin_country", "original_language", "original_name", "overview", "popularity", "poster_path", "season_count", "status", "source", "sources", "updated", "unique_id", "vote_average", "vote_count") SELECT "backdrop_path", "created", "episode_count", "first_air_date", "genres", "id", "in_production", "name", "origin_country", "original_language", "original_name", "overview", "popularity", "poster_path", "season_count", "status", 1, json_object('tmdb_id', "tmdb_id"), "updated", CAST("tmdb_id" AS TEXT), "vote_average", "vote_count" FROM "TVProfile";
DROP TABLE "TVProfile";
ALTER TABLE "new_TVProfile" RENAME TO "TVProfile";
CREATE TABLE "new_TV" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hidden" INTEGER DEFAULT 0,
    "profile_id" TEXT NOT NULL,
    "collection_id" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "TV_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "TVProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TV_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "Collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TV_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TV" ("collection_id", "created", "hidden", "id", "profile_id", "updated", "user_id") SELECT "collection_id", "created", "hidden", "id", "profile_id", "updated", "user_id" FROM "TV";
DROP TABLE "TV";
ALTER TABLE "new_TV" RENAME TO "TV";
CREATE UNIQUE INDEX "TV_user_id_profile_id_key" ON "TV"("user_id", "profile_id");
CREATE TABLE "new_MemberNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unique_id" TEXT NOT NULL,
    "content" TEXT,
    "type" INTEGER DEFAULT 1,
    "status" INTEGER DEFAULT 1,
    "is_delete" INTEGER DEFAULT 0,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberNotification_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MemberNotification" ("content", "created", "id", "is_delete", "member_id", "status", "type", "updated", "unique_id") SELECT "content", "created", "id", "is_delete", "member_id", "status", "type", "updated", "content" FROM "MemberNotification";
DROP TABLE "MemberNotification";
ALTER TABLE "new_MemberNotification" RENAME TO "MemberNotification";
CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unique_id" TEXT NOT NULL,
    "content" TEXT,
    "type" INTEGER DEFAULT 1,
    "status" INTEGER DEFAULT 1,
    "is_delete" INTEGER DEFAULT 0,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Notification" ("content", "created", "id", "is_delete", "updated", "unique_id", "user_id") SELECT "content", "created", "id", "is_delete", "updated", "content", "user_id" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "Episode_user_id_profile_id_key" ON "Episode"("user_id", "profile_id");
