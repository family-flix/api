/**
 * @file 删除指定电影
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Result } from "@/types";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_media_delete(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { media_id } = req.body as Partial<{ media_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!media_id) {
    return e(Result.Err("缺少 id"));
  }
  const media = await store.prisma.media.findFirst({
    where: {
      id: media_id,
      user_id: user.id,
    },
  });
  if (!media) {
    return e(Result.Err("没有匹配的记录"));
  }
  await store.prisma.media.delete({
    where: { id: media.id },
  });
  return res.status(200).json({ code: 0, msg: "删除成功", data: null });
}
