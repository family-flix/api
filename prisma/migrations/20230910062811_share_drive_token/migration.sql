/*
  Warnings:

  - You are about to drop the column `drive_id` on the `DriveToken` table. All the data in the column will be lost.
  - Added the required column `drive_token_id` to the `Drive` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
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
    "drive_token_id" TEXT NOT NULL,
    CONSTRAINT "Drive_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Drive_drive_token_id_fkey" FOREIGN KEY ("drive_token_id") REFERENCES "DriveToken" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Drive" ("avatar", "created", "drive_token_id", "id", "invalid", "latest_analysis", "name", "profile", "remark", "root_folder_id", "root_folder_name", "total_size", "type", "unique_id", "updated", "used_size", "user_id") SELECT d."avatar", d."created", dt."id", d."id", d."invalid", d."latest_analysis", d."name", d."profile", d."remark", d."root_folder_id", d."root_folder_name", d."total_size", d."type", d."unique_id", d."updated", d."used_size", d."user_id" FROM "Drive" d LEFT JOIN "DriveToken" dt ON d."id" = dt."drive_id";;
DROP TABLE "Drive";
ALTER TABLE "new_Drive" RENAME TO "Drive";
CREATE UNIQUE INDEX "Drive_user_id_unique_id_key" ON "Drive"("user_id", "unique_id");
CREATE TABLE "new_DriveToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" TEXT NOT NULL,
    "expired_at" REAL NOT NULL
);
INSERT INTO "new_DriveToken" ("created", "data", "expired_at", "id", "updated") SELECT "created", "data", "expired_at", "id", "updated" FROM "DriveToken";
DROP TABLE "DriveToken";
ALTER TABLE "new_DriveToken" RENAME TO "DriveToken";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
