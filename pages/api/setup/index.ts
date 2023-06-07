/**
 * @file 删除播放记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  //   const { authorization } = req.headers;
  const { database_url, tmdb_token, assets_path } = req.body as Partial<{
    database_url: string;
    tmdb_token: string;
    assets_path: string;
    username: string;
    password: string;
  }>;
//   if (!database_url) {
// 	return
//   }
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: database_url,
      },
    },
  });

  res.status(200).json({ code: 0, msg: "", data: name });
}
