/**
 * @file 管理后台/删除指定电视剧
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
  const { tv_id: id } = req.query as Partial<{
    tv_id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  const user = t_res.data;
  const { id: user_id } = user;
  const tv_res = await store.find_tv({
    id,
    user_id,
  });
  if (tv_res.error) {
    return e(tv_res);
  }
  const tv = tv_res.data;
  if (tv === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  await store.prisma.episode.deleteMany({
    where: {
      tv_id: id,
      user_id: user.id,
    },
  });
  await store.prisma.season.deleteMany({
    where: {
      tv_id: id,
      user_id: user.id,
    },
  });
  await store.prisma.tv.delete({
    where: {
      id,
    },
  });
  res.status(200).json({
    code: 0,
    msg: "删除成功",
    data: null,
  });
}
