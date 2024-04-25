/**
 * @file 删除未识别的剧集
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
  const { id } = req.body as Partial<{ id: string }>;
  if (!id) {
    return e(Result.Err("缺少剧集 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const r2 = await store.delete_parsed_episode({
    id,
    user_id: user.id,
  });
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({ code: 0, msg: "删除成功", data: null });
}
