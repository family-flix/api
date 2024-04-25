/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { IQiyiClient } from "@/domains/media_profile/iqiyi";
import { YoukuClient } from "@/domains/media_profile/youku";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_common_analysis(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { url } = req.body as Partial<{ url: string }>;

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!url) {
    return e(Result.Err("缺少 url"));
  }
  const u = decodeURIComponent(url);
  if (u.startsWith("https://www.iqiyi.com/")) {
    const client = new IQiyiClient({});
    const r = await client.fetch_profile_with_seasons(u);
    if (r.error) {
      return e(Result.Err(r.error.message));
    }
    return res.status(200).json({ code: 0, msg: "", data: r.data });
  }
  if (u.startsWith("https://v.youku.com/")) {
    const client = new YoukuClient({});
    const r = await client.fetch_profile_with_seasons(u);
    if (r.error) {
      return e(Result.Err(r.error.message));
    }
    return res.status(200).json({ code: 0, msg: "", data: r.data });
  }
  return e(Result.Err("未知的 url"));
}
