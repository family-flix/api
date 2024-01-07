/**
 * @file 删除指定影视剧详情
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
  const { media_profile_id } = req.query as Partial<{ media_profile_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!media_profile_id) {
    return e(Result.Err("缺少 id"));
  }
  const existing = await store.prisma.media_profile.findFirst({
    where: {
      id: media_profile_id,
    },
  });
  if (!existing) {
    return e(Result.Err("没有匹配的记录"));
  }
  await store.prisma.media_profile.delete({
    where: {
      id: media_profile_id,
    },
  });
  res.status(200).json({ code: 0, msg: "删除成功", data: null });
}
