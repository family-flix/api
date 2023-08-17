/*
  Warnings:

  - You are about to drop the column `season_number` on the `Episode` table. All the data in the column will be lost.
  - You are about to alter the column `episode_number` on the `Episode` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `season_number` on the `Season` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - A unique constraint covering the columns `[user_id,unique_id]` on the table `Drive` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `episode_text` to the `Episode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `season_text` to the `Episode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `season_text` to the `Season` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Drive_unique_id_key";

-- DropIndex
DROP INDEX "SharedFile_url_key";

-- CreateTable
CREATE TABLE "subtitle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "movie_id" TEXT,
    "episode_id" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "subtitle_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subtitle_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "subtitle_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "subtitle_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "collection_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "desc" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "Permission_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemberNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "is_delete" INTEGER NOT NULL DEFAULT 0,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberNotification_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT,
    "name" TEXT,
    "avatar" TEXT,
    "remark" TEXT NOT NULL,
    "disabled" INTEGER DEFAULT 0,
    "delete" INTEGER DEFAULT 0,
    "inviter_id" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Member_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Member" ("created", "delete", "disabled", "email", "id", "name", "remark", "updated", "user_id") SELECT "created", "delete", "disabled", "email", "id", "name", "remark", "updated", "user_id" FROM "Member";
DROP TABLE "Member";
ALTER TABLE "new_Member" RENAME TO "Member";
CREATE UNIQUE INDEX "Member_user_id_remark_key" ON "Member"("user_id", "remark");
CREATE TABLE "new_TV" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hidden" INTEGER DEFAULT 0,
    "profile_id" TEXT NOT NULL,
    "collection_id" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "TV_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "TVProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TV_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TV_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TV" ("created", "hidden", "id", "profile_id", "updated", "user_id") SELECT "created", "hidden", "id", "profile_id", "updated", "user_id" FROM "TV";
DROP TABLE "TV";
ALTER TABLE "new_TV" RENAME TO "TV";
CREATE UNIQUE INDEX "TV_profile_id_key" ON "TV"("profile_id");
CREATE TABLE "new_Episode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "episode_text" TEXT NOT NULL,
    "season_text" TEXT NOT NULL,
    "episode_number" INTEGER NOT NULL,
    "profile_id" TEXT NOT NULL,
    "tv_id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Episode_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "episode_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Episode_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Episode_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Episode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Episode" ("created", "episode_text", "season_text", "episode_number", "id", "profile_id", "season_id", "tv_id", "updated", "user_id") SELECT "created", "episode_number", "season_number",  CAST(SUBSTR(episode_number, 2) AS INT), "id", "profile_id", "season_id", "tv_id", "updated", "user_id" FROM "Episode";
DROP TABLE "Episode";
ALTER TABLE "new_Episode" RENAME TO "Episode";
CREATE UNIQUE INDEX "Episode_profile_id_key" ON "Episode"("profile_id");
CREATE TABLE "new_SeasonProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tmdb_id" INTEGER,
    "name" TEXT,
    "overview" TEXT,
    "poster_path" TEXT,
    "season_number" INTEGER,
    "air_date" TEXT,
    "episode_count" INTEGER DEFAULT 0
);
INSERT INTO "new_SeasonProfile" ("air_date", "created", "episode_count", "id", "name", "overview", "poster_path", "season_number", "tmdb_id", "updated") SELECT "air_date", "created", "episode_count", "id", "name", "overview", "poster_path", "season_number", "tmdb_id", "updated" FROM "SeasonProfile";
DROP TABLE "SeasonProfile";
ALTER TABLE "new_SeasonProfile" RENAME TO "SeasonProfile";
CREATE TABLE "new_episode_profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tmdb_id" INTEGER,
    "name" TEXT,
    "overview" TEXT,
    "air_date" TEXT,
    "runtime" INTEGER DEFAULT 0
);
INSERT INTO "new_episode_profile" ("air_date", "created", "id", "name", "overview", "runtime", "tmdb_id", "updated") SELECT "air_date", "created", "id", "name", "overview", "runtime", "tmdb_id", "updated" FROM "episode_profile";
DROP TABLE "episode_profile";
ALTER TABLE "new_episode_profile" RENAME TO "episode_profile";
CREATE TABLE "new_Movie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "collection_id" TEXT,
    CONSTRAINT "Movie_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "movie_profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Movie_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Movie_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Movie" ("created", "id", "profile_id", "updated", "user_id") SELECT "created", "id", "profile_id", "updated", "user_id" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE UNIQUE INDEX "Movie_profile_id_key" ON "Movie"("profile_id");
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
    CONSTRAINT "Season_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Season_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Season_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Season" ("created", "id", "profile_id", "season_text", "season_number", "tv_id", "updated", "user_id") SELECT "created", "id", "profile_id", "season_number",  CAST(SUBSTR(season_number, 2) AS INT), "tv_id", "updated", "user_id" FROM "Season";
DROP TABLE "Season";
ALTER TABLE "new_Season" RENAME TO "Season";
CREATE UNIQUE INDEX "Season_profile_id_key" ON "Season"("profile_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "Drive_user_id_unique_id_key" ON "Drive"("user_id", "unique_id");
