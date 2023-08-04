/**
 * @file 删除指定文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { FileType } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id } = req.query as Partial<{
    file_id: string;
  }>;
  if (!file_id) {
    return e(Result.Err("缺少文件 file_id"));
  }

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const file_res = await store.find_file({
    file_id,
    user_id: user.id,
  });
  if (file_res.error) {
    return e(file_res);
  }
  const file = file_res.data;
  if (!file) {
    return e(Result.Err("没有匹配的记录"));
  }
  await store.prisma.parsed_episode.deleteMany({
    where: {
      file_id,
    },
  });
  await store.prisma.parsed_season.deleteMany({
    where: {
      file_id,
    },
  });
  await store.prisma.parsed_tv.deleteMany({
    where: {
      file_id,
    },
  });
  await store.prisma.parsed_movie.deleteMany({
    where: {
      file_id,
    },
  });
  await store.prisma.file.deleteMany({
    where: {
      file_id,
    },
  });
  res.status(200).json({
    code: 0,
    msg: "删除成功",
    data: null,
  });
}
