/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `Statistics` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Statistics_user_id_key" ON "Statistics"("user_id");
