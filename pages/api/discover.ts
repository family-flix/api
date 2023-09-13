/**
 * @file 获取推荐
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const r = await store.prisma.collection.findMany({
    where: {
      user_id: user.id,
    },
    include: {
      seasons: {
        include: {
          profile: true,
        },
      },
    },
    take: 10,
    orderBy: {},
  });
  res.status(200).json({ code: 0, msg: "", data: r });
}

// /*
//   Warnings:

//   - You are about to drop the column `parsed_tv_id` on the `BindForParsedTV` table. All the data in the column will be lost.
//   - Added the required column `file_id_link_resource` to the `BindForParsedTV` table without a default value. This is not possible if the table is not empty.

// */
// -- AlterTable
// ALTER TABLE "SeasonProfile" ADD COLUMN "vote_average" REAL DEFAULT 0;

// -- RedefineTables
// PRAGMA foreign_keys=OFF;
// CREATE TABLE "new_PlayHistory" (
//     "id" TEXT NOT NULL PRIMARY KEY,
//     "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     "duration" REAL DEFAULT 0,
//     "current_time" REAL DEFAULT 0,
//     "thumbnail" TEXT,
//     "file_id" TEXT,
//     "tv_id" TEXT,
//     "season_id" TEXT,
//     "episode_id" TEXT,
//     "movie_id" TEXT,
//     "member_id" TEXT NOT NULL,
//     CONSTRAINT "PlayHistory_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
//     CONSTRAINT "PlayHistory_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
//     CONSTRAINT "PlayHistory_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
//     CONSTRAINT "PlayHistory_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
//     CONSTRAINT "PlayHistory_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
// );
// INSERT INTO "new_PlayHistory" ("created", "current_time", "duration", "episode_id", "season_id", "file_id", "id", "member_id", "movie_id", "thumbnail", "tv_id", "updated") SELECT p."created", p."current_time", p."duration", p."episode_id", e."season_id", p."file_id", p."id", p."member_id", p."movie_id", p."thumbnail", p."tv_id", p."updated" FROM "PlayHistory" p LEFT JOIN "Episode" e ON p."episode_id" = e."id";
// DROP TABLE "PlayHistory";
// ALTER TABLE "new_PlayHistory" RENAME TO "PlayHistory";
// CREATE TABLE "new_BindForParsedTV" (
//     "id" TEXT NOT NULL PRIMARY KEY,
//     "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     "url" TEXT NOT NULL,
//     "file_id" TEXT NOT NULL,
//     "file_id_link_resource" TEXT NOT NULL,
//     "name" TEXT NOT NULL,
//     "in_production" INTEGER DEFAULT 1,
//     "invalid" INTEGER DEFAULT 0,
//     "season_id" TEXT,
//     "user_id" TEXT NOT NULL,
//     CONSTRAINT "BindForParsedTV_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
//     CONSTRAINT "BindForParsedTV_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
// );
// INSERT INTO "new_BindForParsedTV" ("created", "file_id", "file_id_link_resource", "id", "in_production", "invalid", "name", "updated", "url", "user_id") SELECT b."created", b."file_id", p."file_id", b."id", b."in_production", b."invalid", b."name", b."updated", b."url", b."user_id" FROM "BindForParsedTV" b LEFT JOIN "ParsedTV" p ON p."id" = b."parsed_tv_id";
// DROP TABLE "BindForParsedTV";
// ALTER TABLE "new_BindForParsedTV" RENAME TO "BindForParsedTV";
