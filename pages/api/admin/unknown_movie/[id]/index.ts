/**
 * @file 获取未知电影详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { FileRecord, ParsedMovieRecord } from "@/domains/store/types";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;

  if (!id) {
    return e(Result.Err("缺少 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const profile = await store.prisma.parsed_movie.findFirst({
    where: {
      id,
      user_id: user.id,
    },
  });
  if (!profile) {
    return e(Result.Err("没有匹配的记录"));
  }
  const file = await store.prisma.file.findFirst({
    where: {
      file_id: profile.file_id,
    },
  });
  const data: ParsedMovieRecord & {
    file: null | FileRecord;
  } = {
    ...profile,
    file: null,
  };
  if (file) {
    data.file = file;
  }
  res.status(200).json({ code: 0, msg: "", data });
}
