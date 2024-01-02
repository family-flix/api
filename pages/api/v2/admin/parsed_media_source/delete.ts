/**
 * @file 删除指定视频源（不删除文件）
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { parsed_media_source_id } = req.body as Partial<{ parsed_media_source_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!parsed_media_source_id) {
    return e(Result.Err("缺少影片 id"));
  }
  const media_source = await store.prisma.parsed_media_source.findFirst({
    where: {
      id: parsed_media_source_id,
      user_id: user.id,
    },
  });
  if (!media_source) {
    return e(Result.Err("没有匹配的影片记录"));
  }
  await store.prisma.parsed_episode.delete({
    where: {
      id: media_source.id,
    },
  });
  res.status(200).json({ code: 0, msg: "删除成功", data: null });
}
