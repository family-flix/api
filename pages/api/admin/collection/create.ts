/**
 * @file
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
  const { title, type, desc, medias, sort, rules, styles } = req.body as Partial<{
    title: string;
    desc: string;
    sort: number;
    type: number;
    medias: {}[];
    rules: Record<string, unknown>;
    styles: Record<string, unknown>;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!title) {
    return e(Result.Err("缺少 title"));
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
