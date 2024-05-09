-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InvitationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "text" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "used_at" DATETIME,
    "expired_at" DATETIME,
    "inviter_id" TEXT NOT NULL,
    "invitee_id" TEXT,
    CONSTRAINT "InvitationCode_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvitationCode_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_InvitationCode" ("created", "id", "invitee_id", "inviter_id", "text", "updated", "used", "used_at") SELECT "created", "id", "invitee_id", "inviter_id", "text", "updated", "used", "used_at" FROM "InvitationCode";
DROP TABLE "InvitationCode";
ALTER TABLE "new_InvitationCode" RENAME TO "InvitationCode";
CREATE UNIQUE INDEX "InvitationCode_invitee_id_key" ON "InvitationCode"("invitee_id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
