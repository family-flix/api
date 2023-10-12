/*
  Warnings:

  - You are about to alter the column `cur_count` on the `TVNeedComplete` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `episode_count` on the `TVNeedComplete` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.

*/
-- CreateTable
CREATE TABLE "SharedMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "season_id" TEXT,
    "movie_id" TEXT,
    "member_from_id" TEXT NOT NULL,
    "member_target_id" TEXT NOT NULL,
    CONSTRAINT "SharedMedia_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SharedMedia_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SharedMedia_member_from_id_fkey" FOREIGN KEY ("member_from_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SharedMedia_member_target_id_fkey" FOREIGN KEY ("member_target_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "type" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "extra" TEXT,
    "rules" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "hidden" INTEGER NOT NULL DEFAULT 0,
    "styles" TEXT,
    "medias" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Collection_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Collection" ("created", "desc", "hidden", "id", "rules", "sort", "styles", "title", "type", "updated", "user_id") SELECT "created", "desc", "hidden", "id", "rules", "sort", "styles", "title", "type", "updated", "user_id" FROM "Collection";
DROP TABLE "Collection";
ALTER TABLE "new_Collection" RENAME TO "Collection";
CREATE TABLE "new_TVNeedComplete" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "episode_count" INTEGER DEFAULT 0,
    "cur_count" INTEGER DEFAULT 0,
    "text" TEXT,
    "season_id" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "TVNeedComplete_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TVNeedComplete_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TVNeedComplete" ("created", "cur_count", "episode_count", "id", "updated", "user_id") SELECT "created", "cur_count", "episode_count", "id", "updated", "user_id" FROM "TVNeedComplete";
DROP TABLE "TVNeedComplete";
ALTER TABLE "new_TVNeedComplete" RENAME TO "TVNeedComplete";
CREATE UNIQUE INDEX "TVNeedComplete_season_id_key" ON "TVNeedComplete"("season_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
