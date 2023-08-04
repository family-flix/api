-- DropIndex
DROP INDEX "PlayHistory_movie_id_key";

-- DropIndex
DROP INDEX "PlayHistory_tv_id_key";

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Episode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "episode_number" TEXT NOT NULL,
    "season_number" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "tv_id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Episode_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "episode_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Episode_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Episode_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Episode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Episode" ("created", "episode_number", "id", "profile_id", "season_id", "season_number", "tv_id", "updated", "user_id") SELECT "created", "episode_number", "id", "profile_id", "season_id", "season_number", "tv_id", "updated", "user_id" FROM "Episode";
DROP TABLE "Episode";
ALTER TABLE "new_Episode" RENAME TO "Episode";
CREATE UNIQUE INDEX "Episode_profile_id_key" ON "Episode"("profile_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
