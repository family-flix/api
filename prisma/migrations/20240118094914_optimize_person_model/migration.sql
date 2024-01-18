/*
  Warnings:

  - You are about to drop the column `movie_id` on the `Person` table. All the data in the column will be lost.
  - You are about to drop the column `season_id` on the `Person` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `PersonProfile` table. All the data in the column will be lost.
  - You are about to drop the column `sources` on the `PersonProfile` table. All the data in the column will be lost.
  - You are about to drop the column `unique_id` on the `PersonProfile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[imdb_id]` on the table `MediaProfile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `media_id` to the `Person` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MediaProfile" ADD COLUMN "imdb_id" TEXT;
ALTER TABLE "MediaProfile" ADD COLUMN "tips" TEXT;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "known_for_department" TEXT,
    "profile_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    CONSTRAINT "Person_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "PersonProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Person_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "MediaProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Person" ("created", "id", "known_for_department", "name", "order", "profile_id", "updated") SELECT "created", "id", "known_for_department", "name", "order", "profile_id", "updated" FROM "Person";
DROP TABLE "Person";
ALTER TABLE "new_Person" RENAME TO "Person";
CREATE TABLE "new_PersonProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "biography" TEXT,
    "profile_path" TEXT,
    "birthday" TEXT,
    "place_of_birth" TEXT,
    "known_for_department" TEXT,
    "profile" TEXT NOT NULL DEFAULT '',
    "tmdb_id" TEXT,
    "douban_id" TEXT,
    "imdb_id" TEXT
);
INSERT INTO "new_PersonProfile" ("alias", "biography", "birthday", "created", "id", "known_for_department", "name", "place_of_birth", "profile", "profile_path", "updated") SELECT "alias", "biography", "birthday", "created", "id", "known_for_department", "name", "place_of_birth", coalesce("profile", '') AS "profile", "profile_path", "updated" FROM "PersonProfile";
DROP TABLE "PersonProfile";
ALTER TABLE "new_PersonProfile" RENAME TO "PersonProfile";
CREATE UNIQUE INDEX "PersonProfile_tmdb_id_key" ON "PersonProfile"("tmdb_id");
CREATE UNIQUE INDEX "PersonProfile_douban_id_key" ON "PersonProfile"("douban_id");
CREATE UNIQUE INDEX "PersonProfile_imdb_id_key" ON "PersonProfile"("imdb_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "MediaProfile_imdb_id_key" ON "MediaProfile"("imdb_id");
