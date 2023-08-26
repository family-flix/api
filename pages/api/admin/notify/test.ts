/**
 * @file 测试发送推送
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { Notify } from "@/domains/notify";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { text } = req.body as Partial<{ text: string }>;
  if (!text) {
    return e(Result.Err("请传入推送内容"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const notify_res = await Notify.New({ type: 1, store, token: user.settings.tmdb_token });
  if (notify_res.error) {
    return e(notify_res);
  }
  const notify = notify_res.data;
  const r = await notify.send({
    text,
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "推送成功", data: null });
}
