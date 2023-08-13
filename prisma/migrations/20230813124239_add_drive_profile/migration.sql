/*
  Warnings:

  - You are about to drop the `notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `access_token` on the `DriveToken` table. All the data in the column will be lost.
  - You are about to drop the column `refresh_token` on the `DriveToken` table. All the data in the column will be lost.
  - You are about to drop the column `aliyun_user_id` on the `Drive` table. All the data in the column will be lost.
  - You are about to drop the column `app_id` on the `Drive` table. All the data in the column will be lost.
  - You are about to drop the column `device_id` on the `Drive` table. All the data in the column will be lost.
  - You are about to drop the column `drive_id` on the `Drive` table. All the data in the column will be lost.
  - Added the required column `data` to the `DriveToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profile` to the `Drive` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unique_id` to the `Drive` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "episode_profile" ADD COLUMN "runtime" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "movie_profile" ADD COLUMN "runtime" INTEGER DEFAULT 0;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "notification";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "MemberSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberSetting_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT,
    "is_read" INTEGER NOT NULL DEFAULT 0,
    "is_delete" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "tv_id" TEXT,
    "season_id" TEXT,
    "episode_id" TEXT,
    "movie_id" TEXT,
    "member_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Report_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Report_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DriveToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" TEXT NOT NULL,
    "expired_at" REAL NOT NULL,
    "drive_id" TEXT NOT NULL,
    CONSTRAINT "DriveToken_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DriveToken" ("created", "drive_id", "data", "expired_at", "id", "updated") SELECT "created", "drive_id", json_object('access_token', "access_token", 'refresh_token', "refresh_token"), "expired_at", "id", "updated" FROM "DriveToken";
DROP TABLE "DriveToken";
ALTER TABLE "new_DriveToken" RENAME TO "DriveToken";
CREATE UNIQUE INDEX "DriveToken_drive_id_key" ON "DriveToken"("drive_id");
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
    "latest_analysis" DATETIME,
    "root_folder_name" TEXT,
    "root_folder_id" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Drive_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Drive" ("avatar", "created", "id", "profile", "invalid", "latest_analysis", "name", "root_folder_id", "root_folder_name", "total_size", "updated", "unique_id", "used_size", "user_id") SELECT "avatar", "created", "id", json_object('user_name', "name", 'nick_name', "name", 'avatar', "avatar", 'drive_id', "drive_id", 'device_id', "device_id", 'user_id', "aliyun_user_id", 'app_id', "app_id"), "invalid", "latest_analysis", "name", "root_folder_id", "root_folder_name", "total_size", "updated", "drive_id", "used_size", "user_id" FROM "Drive";
DROP TABLE "Drive";
ALTER TABLE "new_Drive" RENAME TO "Drive";
CREATE UNIQUE INDEX "Drive_unique_id_key" ON "Drive"("unique_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "MemberSetting_member_id_key" ON "MemberSetting"("member_id");
