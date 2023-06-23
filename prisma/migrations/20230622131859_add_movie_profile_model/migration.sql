/*
  Warnings:

  - You are about to drop the column `name` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `original_name` on the `Movie` table. All the data in the column will be lost.
  - Added the required column `profile_id` to the `Movie` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "movie_profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tmdb_id" INTEGER NOT NULL,
    "name" TEXT,
    "original_name" TEXT,
    "overview" TEXT,
    "poster_path" TEXT,
    "backdrop_path" TEXT,
    "air_date" TEXT,
    "original_language" TEXT,
    "popularity" REAL DEFAULT 0,
    "vote_average" REAL DEFAULT 0,
    "vote_count" REAL DEFAULT 0
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Movie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Movie_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "movie_profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Movie_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Movie" ("created", "id", "updated", "user_id") SELECT "created", "id", "updated", "user_id" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE UNIQUE INDEX "Movie_profile_id_key" ON "Movie"("profile_id");
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
    CONSTRAINT "ParsedMovie_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedMovie_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedMovie_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ParsedMovie" ("created", "drive_id", "file_id", "file_name", "id", "name", "parent_file_id", "parent_paths", "size", "type", "updated", "user_id") SELECT "created", "drive_id", "file_id", "file_name", "id", "name", "parent_file_id", "parent_paths", "size", "type", "updated", "user_id" FROM "ParsedMovie";
DROP TABLE "ParsedMovie";
ALTER TABLE "new_ParsedMovie" RENAME TO "ParsedMovie";

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
