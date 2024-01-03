-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReportV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 1,
    "data" TEXT NOT NULL,
    "answer" TEXT,
    "media_id" TEXT,
    "media_source_id" TEXT,
    "reply_media_id" TEXT,
    "member_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ReportV2_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportV2_media_source_id_fkey" FOREIGN KEY ("media_source_id") REFERENCES "MediaSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportV2_reply_media_id_fkey" FOREIGN KEY ("reply_media_id") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportV2_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportV2_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ReportV2" ("answer", "created", "data", "id", "media_source_id", "member_id", "reply_media_id", "status", "type", "updated", "user_id") SELECT "answer", "created", "data", "id", "media_source_id", "member_id", "reply_media_id", "status", "type", "updated", "user_id" FROM "ReportV2";
DROP TABLE "ReportV2";
ALTER TABLE "new_ReportV2" RENAME TO "ReportV2";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
