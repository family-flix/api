/*
  Warnings:

  - You are about to drop the column `collection_id` on the `TV` table. All the data in the column will be lost.
  - You are about to drop the column `collection_id` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `Drive` table. All the data in the column will be lost.
  - You are about to drop the column `collection_id` on the `Season` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "MemberInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT,
    "expired_at" TEXT NOT NULL,
    "count_limit" INTEGER,
    "disabled" INTEGER NOT NULL DEFAULT 0,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberInvite_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_collectionTotv" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_collectionTotv_A_fkey" FOREIGN KEY ("A") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_collectionTotv_B_fkey" FOREIGN KEY ("B") REFERENCES "TV" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_collectionToseason" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_collectionToseason_A_fkey" FOREIGN KEY ("A") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_collectionToseason_B_fkey" FOREIGN KEY ("B") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_collectionTomovie" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_collectionTomovie_A_fkey" FOREIGN KEY ("A") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_collectionTomovie_B_fkey" FOREIGN KEY ("B") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "permission" TEXT,
    "disabled" INTEGER DEFAULT 0,
    "delete" INTEGER DEFAULT 0,
    "inviter_id" TEXT,
    "from_invite_id" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Member_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Member_from_invite_id_fkey" FOREIGN KEY ("from_invite_id") REFERENCES "MemberInvite" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Member" ("avatar", "created", "delete", "disabled", "email", "id", "inviter_id", "name", "permission", "remark", "updated", "user_id") SELECT "avatar", "created", "delete", "disabled", "email", "id", "inviter_id", "name", "permission", "remark", "updated", "user_id" FROM "Member";
DROP TABLE "Member";
ALTER TABLE "new_Member" RENAME TO "Member";
CREATE UNIQUE INDEX "Member_user_id_inviter_id_remark_key" ON "Member"("user_id", "inviter_id", "remark");
CREATE TABLE "new_TV" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hidden" INTEGER DEFAULT 0,
    "profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "TV_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "TVProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TV_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TV" ("created", "hidden", "id", "profile_id", "updated", "user_id") SELECT "created", "hidden", "id", "profile_id", "updated", "user_id" FROM "TV";
DROP TABLE "TV";
ALTER TABLE "new_TV" RENAME TO "TV";
CREATE TABLE "new_Movie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Movie_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "movie_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Movie_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Movie" ("created", "id", "profile_id", "updated", "user_id") SELECT "created", "id", "profile_id", "updated", "user_id" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE TABLE "new_Drive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unique_id" TEXT NOT NULL,
    "type" INTEGER DEFAULT 0,
    "name" TEXT NOT NULL,
    "remark" TEXT,
    "avatar" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "total_size" REAL DEFAULT 0,
    "used_size" REAL DEFAULT 0,
    "invalid" INTEGER DEFAULT 0,
    "hidden" INTEGER DEFAULT 0,
    "sort" INTEGER DEFAULT 0,
    "latest_analysis" DATETIME,
    "root_folder_name" TEXT,
    "root_folder_id" TEXT,
    "drive_token_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Drive_drive_token_id_fkey" FOREIGN KEY ("drive_token_id") REFERENCES "DriveToken" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Drive_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Drive" ("avatar", "created", "drive_token_id", "hidden", "id", "invalid", "latest_analysis", "name", "profile", "remark", "root_folder_id", "root_folder_name", "total_size", "type", "unique_id", "updated", "used_size", "user_id") SELECT "avatar", "created", "drive_token_id", "hidden", "id", "invalid", "latest_analysis", "name", "profile", "remark", "root_folder_id", "root_folder_name", "total_size", "type", "unique_id", "updated", "used_size", "user_id" FROM "Drive";
DROP TABLE "Drive";
ALTER TABLE "new_Drive" RENAME TO "Drive";
CREATE UNIQUE INDEX "Drive_user_id_unique_id_key" ON "Drive"("user_id", "unique_id");
CREATE TABLE "new_Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "season_text" TEXT NOT NULL,
    "season_number" INTEGER NOT NULL,
    "profile_id" TEXT NOT NULL,
    "tv_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Season_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "SeasonProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Season_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Season_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Season" ("created", "id", "profile_id", "season_number", "season_text", "tv_id", "updated", "user_id") SELECT "created", "id", "profile_id", "season_number", "season_text", "tv_id", "updated", "user_id" FROM "Season";
DROP TABLE "Season";
ALTER TABLE "new_Season" RENAME TO "Season";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "_collectionTotv_AB_unique" ON "_collectionTotv"("A", "B");

-- CreateIndex
CREATE INDEX "_collectionTotv_B_index" ON "_collectionTotv"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_collectionToseason_AB_unique" ON "_collectionToseason"("A", "B");

-- CreateIndex
CREATE INDEX "_collectionToseason_B_index" ON "_collectionToseason"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_collectionTomovie_AB_unique" ON "_collectionTomovie"("A", "B");

-- CreateIndex
CREATE INDEX "_collectionTomovie_B_index" ON "_collectionTomovie"("B");
