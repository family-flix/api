/*
  Warnings:

  - You are about to drop the column `content` on the `output` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "output_line" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "output_id" TEXT,
    CONSTRAINT "output_line_output_id_fkey" FOREIGN KEY ("output_id") REFERENCES "output" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_output" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "output_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_output" ("created", "id", "updated", "user_id") SELECT "created", "id", "updated", "user_id" FROM "output";
DROP TABLE "output";
ALTER TABLE "new_output" RENAME TO "output";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
