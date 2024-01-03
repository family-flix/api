/*
  Warnings:

  - You are about to drop the `TVNeedComplete` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TVProfileQuick` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `episode_id` on the `MemberDiary` table. All the data in the column will be lost.
  - You are about to drop the column `movie_id` on the `MemberDiary` table. All the data in the column will be lost.
  - You are about to drop the column `unique_id` on the `MemberFavorite` table. All the data in the column will be lost.
  - Added the required column `media_source_id` to the `MemberDiary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `media_id` to the `MemberFavorite` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
-- DROP INDEX "TVProfileQuick_name_key";

-- DropTable
-- PRAGMA foreign_keys=off;
-- DROP TABLE "TVNeedComplete";
-- PRAGMA foreign_keys=on;

-- DropTable
-- PRAGMA foreign_keys=off;
-- DROP TABLE "TVProfileQuick";
-- PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "subtitle_v2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL DEFAULT 1,
    "unique_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "media_source_id" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "subtitle_v2_media_source_id_fkey" FOREIGN KEY ("media_source_id") REFERENCES "MediaSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "subtitle_v2_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParsedMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "original_name" TEXT,
    "air_year" TEXT,
    "season_text" TEXT,
    "can_search" INTEGER NOT NULL DEFAULT 1,
    "media_profile_id" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedMedia_media_profile_id_fkey" FOREIGN KEY ("media_profile_id") REFERENCES "MediaProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParsedMedia_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedMedia_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParsedSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "original_name" TEXT,
    "episode_text" TEXT,
    "season_text" TEXT,
    "file_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "parent_file_id" TEXT NOT NULL,
    "parent_paths" TEXT NOT NULL,
    "size" REAL NOT NULL DEFAULT 0,
    "md5" TEXT,
    "can_search" INTEGER NOT NULL DEFAULT 1,
    "parsed_media_id" TEXT,
    "media_source_id" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedSource_parsed_media_id_fkey" FOREIGN KEY ("parsed_media_id") REFERENCES "ParsedMedia" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedSource_media_source_id_fkey" FOREIGN KEY ("media_source_id") REFERENCES "MediaSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParsedSource_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedSource_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL DEFAULT 1,
    "text" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Media_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "MediaProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL DEFAULT 1,
    "text" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "MediaSource_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaSource_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "MediaSourceProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaSource_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaSeriesProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "original_name" TEXT,
    "alias" TEXT,
    "overview" TEXT,
    "poster_path" TEXT,
    "backdrop_path" TEXT,
    "air_date" TEXT,
    "tmdb_id" TEXT
);

-- CreateTable
CREATE TABLE "MediaProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "original_name" TEXT,
    "alias" TEXT,
    "overview" TEXT,
    "poster_path" TEXT,
    "backdrop_path" TEXT,
    "air_date" TEXT,
    "order" INTEGER NOT NULL,
    "source_count" INTEGER NOT NULL,
    "vote_average" REAL NOT NULL DEFAULT 0,
    "in_production" INTEGER NOT NULL DEFAULT 0,
    "tmdb_id" TEXT,
    "douban_id" TEXT,
    "series_id" TEXT,
    CONSTRAINT "MediaProfile_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "MediaSeriesProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaSourceProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "original_name" TEXT,
    "overview" TEXT,
    "air_date" TEXT,
    "still_path" TEXT,
    "order" INTEGER NOT NULL,
    "runtime" INTEGER,
    "tmdb_id" TEXT,
    "douban_id" TEXT,
    "media_profile_id" TEXT NOT NULL,
    CONSTRAINT "MediaSourceProfile_media_profile_id_fkey" FOREIGN KEY ("media_profile_id") REFERENCES "MediaProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaGenre" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "MediaCountry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "InvalidMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL DEFAULT 1,
    "profile" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "InvalidMedia_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvalidMedia_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvalidMediaSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL DEFAULT 1,
    "profile" TEXT NOT NULL,
    "media_source_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "InvalidMediaSource_media_source_id_fkey" FOREIGN KEY ("media_source_id") REFERENCES "MediaSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvalidMediaSource_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectionV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "type" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 1,
    "extra" TEXT,
    "rules" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "hidden" INTEGER NOT NULL DEFAULT 0,
    "styles" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "CollectionV2_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayHistoryV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "text" TEXT NOT NULL,
    "duration" REAL NOT NULL DEFAULT 0,
    "current_time" REAL NOT NULL DEFAULT 0,
    "thumbnail_path" TEXT,
    "file_id" TEXT,
    "media_id" TEXT NOT NULL,
    "media_source_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "PlayHistoryV2_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayHistoryV2_media_source_id_fkey" FOREIGN KEY ("media_source_id") REFERENCES "MediaSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayHistoryV2_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResourceSyncTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" INTEGER NOT NULL DEFAULT 1,
    "url" TEXT NOT NULL,
    "pwd" TEXT,
    "file_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_id_link_resource" TEXT NOT NULL,
    "file_name_link_resource" TEXT NOT NULL,
    "invalid" INTEGER NOT NULL DEFAULT 0,
    "media_id" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ResourceSyncTask_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceSyncTask_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceSyncTask_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SharedMediaV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "member_from_id" TEXT NOT NULL,
    "member_target_id" TEXT NOT NULL,
    CONSTRAINT "SharedMediaV2_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SharedMediaV2_member_from_id_fkey" FOREIGN KEY ("member_from_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SharedMediaV2_member_target_id_fkey" FOREIGN KEY ("member_target_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 1,
    "data" TEXT NOT NULL,
    "answer" TEXT,
    "media_source_id" TEXT,
    "reply_media_id" TEXT,
    "member_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ReportV2_media_source_id_fkey" FOREIGN KEY ("media_source_id") REFERENCES "MediaSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportV2_reply_media_id_fkey" FOREIGN KEY ("reply_media_id") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportV2_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportV2_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_media_genreTomedia_profile" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_media_genreTomedia_profile_A_fkey" FOREIGN KEY ("A") REFERENCES "MediaGenre" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_media_genreTomedia_profile_B_fkey" FOREIGN KEY ("B") REFERENCES "MediaProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_media_genreTomedia_series_profile" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_media_genreTomedia_series_profile_A_fkey" FOREIGN KEY ("A") REFERENCES "MediaGenre" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_media_genreTomedia_series_profile_B_fkey" FOREIGN KEY ("B") REFERENCES "MediaSeriesProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_media_countryTomedia_profile" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_media_countryTomedia_profile_A_fkey" FOREIGN KEY ("A") REFERENCES "MediaCountry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_media_countryTomedia_profile_B_fkey" FOREIGN KEY ("B") REFERENCES "MediaProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_media_countryTomedia_series_profile" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_media_countryTomedia_series_profile_A_fkey" FOREIGN KEY ("A") REFERENCES "MediaCountry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_media_countryTomedia_series_profile_B_fkey" FOREIGN KEY ("B") REFERENCES "MediaSeriesProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_collection_v2Tomedia" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_collection_v2Tomedia_A_fkey" FOREIGN KEY ("A") REFERENCES "CollectionV2" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_collection_v2Tomedia_B_fkey" FOREIGN KEY ("B") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AsyncTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unique_id" TEXT NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 1,
    "desc" TEXT,
    "percent" REAL NOT NULL DEFAULT 0,
    "percent_text" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "need_stop" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "output_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "AsyncTask_output_id_fkey" FOREIGN KEY ("output_id") REFERENCES "Output" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AsyncTask_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AsyncTask" ("created", "desc", "error", "id", "need_stop", "output_id", "status", "type", "unique_id", "updated", "user_id") SELECT "created", "desc", "error", "id", coalesce("need_stop", 0) AS "need_stop", "output_id", coalesce("status", 1) AS "status", coalesce("type", 1) AS "type", "unique_id", "updated", "user_id" FROM "AsyncTask";
DROP TABLE "AsyncTask";
ALTER TABLE "new_AsyncTask" RENAME TO "AsyncTask";
CREATE UNIQUE INDEX "AsyncTask_output_id_key" ON "AsyncTask"("output_id");
CREATE TABLE "new_File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_file_id" TEXT NOT NULL,
    "parent_paths" TEXT NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 3,
    "size" REAL NOT NULL DEFAULT 0,
    "md5" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "File_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "File_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_File" ("created", "drive_id", "file_id", "id", "md5", "name", "parent_file_id", "parent_paths", "size", "type", "updated", "user_id") SELECT "created", "drive_id", "file_id", "id", "md5", "name", "parent_file_id", "parent_paths", coalesce("size", 0) AS "size", "type", "updated", "user_id" FROM "File";
DROP TABLE "File";
ALTER TABLE "new_File" RENAME TO "File";
CREATE TABLE "new_TmpFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" REAL NOT NULL DEFAULT 2,
    "name" TEXT NOT NULL,
    "file_id" TEXT,
    "parent_paths" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "TmpFile_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TmpFile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TmpFile" ("created", "drive_id", "id", "name", "parent_paths", "type", "updated", "user_id") SELECT "created", "drive_id", "id", "name", "parent_paths", coalesce("type", 2) AS "type", "updated", "user_id" FROM "TmpFile";
DROP TABLE "TmpFile";
ALTER TABLE "new_TmpFile" RENAME TO "TmpFile";
CREATE TABLE "new_MemberDiary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day" TEXT NOT NULL,
    "content" TEXT,
    "profile" TEXT,
    "media_source_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberDiary_media_source_id_fkey" FOREIGN KEY ("media_source_id") REFERENCES "MediaSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberDiary_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MemberDiary" ("content", "created", "day", "id", "member_id", "profile", "updated") SELECT "content", "created", "day", "id", "member_id", "profile", "updated" FROM "MemberDiary";
DROP TABLE "MemberDiary";
ALTER TABLE "new_MemberDiary" RENAME TO "MemberDiary";
CREATE TABLE "new_Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT,
    "name" TEXT,
    "avatar" TEXT,
    "remark" TEXT NOT NULL,
    "permission" TEXT,
    "disabled" INTEGER NOT NULL DEFAULT 0,
    "delete" INTEGER NOT NULL DEFAULT 0,
    "inviter_id" TEXT,
    "from_invite_id" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Member_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Member_from_invite_id_fkey" FOREIGN KEY ("from_invite_id") REFERENCES "MemberInvite" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Member" ("avatar", "created", "delete", "disabled", "email", "from_invite_id", "id", "inviter_id", "name", "permission", "remark", "updated", "user_id") SELECT "avatar", "created", coalesce("delete", 0) AS "delete", coalesce("disabled", 0) AS "disabled", "email", "from_invite_id", "id", "inviter_id", "name", "permission", "remark", "updated", "user_id" FROM "Member";
DROP TABLE "Member";
ALTER TABLE "new_Member" RENAME TO "Member";
CREATE UNIQUE INDEX "Member_user_id_inviter_id_remark_key" ON "Member"("user_id", "inviter_id", "remark");
CREATE TABLE "new_MemberNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unique_id" TEXT NOT NULL,
    "content" TEXT,
    "type" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 1,
    "is_delete" INTEGER NOT NULL DEFAULT 0,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberNotification_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MemberNotification" ("content", "created", "id", "is_delete", "member_id", "status", "type", "unique_id", "updated") SELECT "content", "created", "id", coalesce("is_delete", 0) AS "is_delete", "member_id", coalesce("status", 1) AS "status", coalesce("type", 1) AS "type", "unique_id", "updated" FROM "MemberNotification";
DROP TABLE "MemberNotification";
ALTER TABLE "new_MemberNotification" RENAME TO "MemberNotification";
CREATE TABLE "new_MemberFavorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL,
    "media_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberFavorite_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberFavorite_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MemberFavorite" ("created", "id", "member_id", "type", "updated") SELECT "created", "id", "member_id", "type", "updated" FROM "MemberFavorite";
DROP TABLE "MemberFavorite";
ALTER TABLE "new_MemberFavorite" RENAME TO "MemberFavorite";
CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unique_id" TEXT NOT NULL,
    "content" TEXT,
    "type" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 1,
    "is_delete" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Notification" ("content", "created", "id", "is_delete", "status", "type", "unique_id", "updated", "user_id") SELECT "content", "created", "id", coalesce("is_delete", 0) AS "is_delete", coalesce("status", 1) AS "status", coalesce("type", 1) AS "type", "unique_id", "updated", "user_id" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "ParsedSource_file_id_key" ON "ParsedSource"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "MediaSeriesProfile_id_key" ON "MediaSeriesProfile"("id");

-- CreateIndex
CREATE UNIQUE INDEX "MediaSeriesProfile_tmdb_id_key" ON "MediaSeriesProfile"("tmdb_id");

-- CreateIndex
CREATE UNIQUE INDEX "MediaProfile_id_key" ON "MediaProfile"("id");

-- CreateIndex
CREATE UNIQUE INDEX "MediaProfile_tmdb_id_key" ON "MediaProfile"("tmdb_id");

-- CreateIndex
CREATE UNIQUE INDEX "MediaProfile_douban_id_key" ON "MediaProfile"("douban_id");

-- CreateIndex
CREATE UNIQUE INDEX "MediaSourceProfile_id_key" ON "MediaSourceProfile"("id");

-- CreateIndex
CREATE UNIQUE INDEX "MediaSourceProfile_tmdb_id_key" ON "MediaSourceProfile"("tmdb_id");

-- CreateIndex
CREATE UNIQUE INDEX "MediaSourceProfile_douban_id_key" ON "MediaSourceProfile"("douban_id");

-- CreateIndex
CREATE UNIQUE INDEX "MediaGenre_id_key" ON "MediaGenre"("id");

-- CreateIndex
CREATE UNIQUE INDEX "MediaCountry_id_key" ON "MediaCountry"("id");

-- CreateIndex
CREATE UNIQUE INDEX "InvalidMedia_media_id_key" ON "InvalidMedia"("media_id");

-- CreateIndex
CREATE UNIQUE INDEX "InvalidMediaSource_media_source_id_key" ON "InvalidMediaSource"("media_source_id");

-- CreateIndex
CREATE UNIQUE INDEX "_media_genreTomedia_profile_AB_unique" ON "_media_genreTomedia_profile"("A", "B");

-- CreateIndex
CREATE INDEX "_media_genreTomedia_profile_B_index" ON "_media_genreTomedia_profile"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_media_genreTomedia_series_profile_AB_unique" ON "_media_genreTomedia_series_profile"("A", "B");

-- CreateIndex
CREATE INDEX "_media_genreTomedia_series_profile_B_index" ON "_media_genreTomedia_series_profile"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_media_countryTomedia_profile_AB_unique" ON "_media_countryTomedia_profile"("A", "B");

-- CreateIndex
CREATE INDEX "_media_countryTomedia_profile_B_index" ON "_media_countryTomedia_profile"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_media_countryTomedia_series_profile_AB_unique" ON "_media_countryTomedia_series_profile"("A", "B");

-- CreateIndex
CREATE INDEX "_media_countryTomedia_series_profile_B_index" ON "_media_countryTomedia_series_profile"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_collection_v2Tomedia_AB_unique" ON "_collection_v2Tomedia"("A", "B");

-- CreateIndex
CREATE INDEX "_collection_v2Tomedia_B_index" ON "_collection_v2Tomedia"("B");
