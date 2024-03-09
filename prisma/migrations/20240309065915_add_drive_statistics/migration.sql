-- CreateTable
CREATE TABLE "DriveStatistics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "user_id" TEXT NOT NULL,
    CONSTRAINT "DriveStatistics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DriveStatistics_user_id_key" ON "DriveStatistics"("user_id");
