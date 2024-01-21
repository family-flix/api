-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MemberToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token" TEXT NOT NULL,
    "used" REAL DEFAULT 0,
    "expired_at" TEXT,
    "invalid" INTEGER NOT NULL DEFAULT 0,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberToken_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MemberToken" ("created", "expired_at", "id", "member_id", "token", "updated", "used") SELECT "created", "expired_at", "id", "member_id", "token", "updated", "used" FROM "MemberToken";
DROP TABLE "MemberToken";
ALTER TABLE "new_MemberToken" RENAME TO "MemberToken";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
