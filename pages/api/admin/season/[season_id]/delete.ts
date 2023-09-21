/**
 * @file 删除指定季
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
  const { season_id: id } = req.query as Partial<{ season_id: string }>;
  if (!id) {
    return e(Result.Err("缺少季 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const season = await store.prisma.season.findFirst({
    where: {
      id,
      user_id: user.id,
    },
  });
  if (!season) {
    return e(Result.Err("没有匹配的记录"));
  }
  await store.prisma.episode.deleteMany({
    where: { season_id: season.id },
  });
  await store.prisma.season.delete({
    where: { id: season.id },
  });
  res.status(200).json({ code: 0, msg: "删除成功", data: null });
}
