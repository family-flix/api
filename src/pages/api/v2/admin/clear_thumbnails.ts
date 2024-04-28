/**
 * @file
 */
import path from "path";
import fs from "fs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_clear_thumbnails(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const histories = await store.prisma.play_history_v2.findMany({
    select: {
      thumbnail_path: true,
    },
    orderBy: {
      updated: "desc",
    },
  });
  const thumbnails = histories
    .map((h) => h.thumbnail_path)
    .filter(Boolean)
    .map((f) => {
      if (!f) {
        return null;
      }
      return f.replace(/\/thumbnail\//, "");
    }) as string[];
  const thumbnail_dir = path.resolve(app.assets, "thumbnail");
  let j = 0;
  try {
    const files = fs.readdirSync(thumbnail_dir);
    for (let i = 0; i < files.length; i += 1) {
      const f = files[i];
      if (!thumbnails.includes(f)) {
        fs.unlinkSync(path.resolve(thumbnail_dir, f));
      }
    }
  } catch (err) {
    const error = err as Error;
    return e(Result.Err(error));
  }
  return res.status(200).json({ code: 0, msg: "", data: null });
}
