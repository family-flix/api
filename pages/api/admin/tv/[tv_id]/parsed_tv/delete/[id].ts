/**
 * @file 删除指定电视剧的指定解析电视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { tv_id, id } = req.query as Partial<{ tv_id: string; id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!tv_id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  if (!id) {
    return e(Result.Err("缺少解析电视剧 id"));
  }
  const user = t_res.data;
  console.log(tv_id, id, user.id);
  const parsed_tv = await store.prisma.parsed_tv.findFirst({
    where: {
      id,
      tv_id,
    },
  });
  if (!parsed_tv) {
    return e(Result.Err("没有匹配的解析电视记录"));
  }
  console.log(parsed_tv);
  await store.prisma.parsed_tv.delete({
    where: {
      id: parsed_tv.id,
    },
    include: {
      parsed_seasons: true,
      parsed_episodes: true,
    },
  });
  res.status(200).json({ code: 0, msg: "删除成功", data: null });
}
