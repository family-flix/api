/**
 * @file 获取指定电视剧详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { TMDBClient } from "@/domains/media_profile/tmdb";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { unique_id } = req.body as Partial<{
    unique_id?: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!unique_id) {
    return e(Result.Err("缺少电视剧详情 id"));
  }
  const user = t_res.data;
  const r1 = await TMDBClient.New({
    token: user.settings.tmdb_token,
  });
  if (r1.error) {
    return e(r1);
  }
  const client = r1.data;
  const r = await client.fetch_tv_profile(unique_id);
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: r.data,
  });
}
