/*
  Warnings:

  - You are about to drop the `output` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "PersonProfile" ADD COLUMN "alias" TEXT;

-- AlterTable
ALTER TABLE "TVProfile" ADD COLUMN "alias" TEXT;

-- AlterTable
ALTER TABLE "movie_profile" ADD COLUMN "alias" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "output";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Output" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filepath" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Output_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemberAuthentication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "provider_arg1" TEXT,
    "provider_arg2" TEXT,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberAuthentication_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemberFavorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unique_id" TEXT,
    "type" INTEGER NOT NULL,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberFavorite_unique_id_fkey" FOREIGN KEY ("unique_id") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberFavorite_unique_id_fkey" FOREIGN KEY ("unique_id") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberFavorite_unique_id_fkey" FOREIGN KEY ("unique_id") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberFavorite_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemberDiary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day" TEXT NOT NULL,
    "content" TEXT,
    "profile" TEXT,
    "episode_id" TEXT,
    "movie_id" TEXT,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberDiary_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberDiary_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberDiary_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_output_line" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "output_id" TEXT,
    CONSTRAINT "output_line_output_id_fkey" FOREIGN KEY ("output_id") REFERENCES "Output" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_output_line" ("content", "created", "id", "output_id", "updated") SELECT "content", "created", "id", "output_id", "updated" FROM "output_line";
DROP TABLE "output_line";
ALTER TABLE "new_output_line" RENAME TO "output_line";
CREATE TABLE "new_subtitle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL DEFAULT 1,
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
INSERT INTO "new_subtitle" ("created", "drive_id", "episode_id", "file_id", "id", "language", "movie_id", "name", "updated", "user_id") SELECT "created", "drive_id", "episode_id", "file_id", "id", "language", "movie_id", "name", "updated", "user_id" FROM "subtitle";
DROP TABLE "subtitle";
ALTER TABLE "new_subtitle" RENAME TO "subtitle";
CREATE TABLE "new_AsyncTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unique_id" TEXT NOT NULL,
    "type" INTEGER DEFAULT 0,
    "desc" TEXT,
    "status" INTEGER DEFAULT 0,
    "need_stop" INTEGER DEFAULT 0,
    "error" TEXT,
    "output_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "AsyncTask_output_id_fkey" FOREIGN KEY ("output_id") REFERENCES "Output" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AsyncTask_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AsyncTask" ("created", "desc", "error", "id", "need_stop", "output_id", "status", "type", "unique_id", "updated", "user_id") SELECT "created", "desc", "error", "id", "need_stop", "output_id", "status", "type", "unique_id", "updated", "user_id" FROM "AsyncTask";
DROP TABLE "AsyncTask";
ALTER TABLE "new_AsyncTask" RENAME TO "AsyncTask";
CREATE UNIQUE INDEX "AsyncTask_output_id_key" ON "AsyncTask"("output_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
