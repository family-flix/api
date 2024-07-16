/**
 * @file 测试发送推送
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { Notify } from "@/domains/notify";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { text, token1, token2 } = req.body as Partial<{ text: string; token1: string; token2: string }>;
  if (!text) {
    return e(Result.Err("请传入推送内容"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (token1) {
    const notify_res = await Notify.New({ type: 1, token: token1, store });
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
  }
  if (token2) {
    const notify_res = await Notify.New({ type: 2, token: token2, store });
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
  }
  res.status(200).json({ code: 0, msg: "推送成功", data: null });
}
