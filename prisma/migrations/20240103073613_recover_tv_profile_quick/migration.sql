-- CreateTable
CREATE TABLE "TVProfileQuick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "tv_profile_id" TEXT NOT NULL,
    CONSTRAINT "TVProfileQuick_tv_profile_id_fkey" FOREIGN KEY ("tv_profile_id") REFERENCES "TVProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TVProfileQuick_name_key" ON "TVProfileQuick"("name");
