/*
  Warnings:

  - You are about to drop the column `assets` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `push_deer_token` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `qiniu_access_token` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `qiniu_scope` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `qiniu_secret_token` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `tmdb_token` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `websites` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `member_id` on the `Permission` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id,inviter_id,remark]` on the table `Member` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `Permission` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Member_user_id_remark_key";

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "permission" TEXT;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detail" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Settings" ("created", "id", "updated", "detail", "user_id") SELECT "created", "id", "updated", json_object('push_deer_token', "tmdb_token"), "user_id" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE UNIQUE INDEX "Settings_user_id_key" ON "Settings"("user_id");
CREATE TABLE "new_Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "desc" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Permission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Permission" ("code", "created", "desc", "id", "updated") SELECT "code", "created", "desc", "id", "updated" FROM "Permission";
DROP TABLE "Permission";
ALTER TABLE "new_Permission" RENAME TO "Permission";
CREATE TABLE "new_MemberNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT,
    "type" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "is_delete" INTEGER NOT NULL DEFAULT 0,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberNotification_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MemberNotification" ("content", "created", "id", "is_delete", "member_id", "status", "updated") SELECT "content", "created", "id", "is_delete", "member_id", "status", "updated" FROM "MemberNotification";
DROP TABLE "MemberNotification";
ALTER TABLE "new_MemberNotification" RENAME TO "MemberNotification";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "Member_user_id_inviter_id_remark_key" ON "Member"("user_id", "inviter_id", "remark");
