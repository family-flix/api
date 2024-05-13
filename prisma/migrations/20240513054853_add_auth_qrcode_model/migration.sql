-- CreateTable
CREATE TABLE "AuthQRCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "step" INTEGER NOT NULL,
    "expires" DATETIME NOT NULL,
    "text" TEXT,
    "member_id" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "AuthQRCode_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuthQRCode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
