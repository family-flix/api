/*
  Warnings:

  - You are about to drop the column `media_source_id` on the `MemberDiary` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ParsedSource" ADD COLUMN "cause_job_id" TEXT;

-- RedefineTables
PRAGMA foreign_keys=OFF;
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
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
