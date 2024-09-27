/**
 * @file 测试发送推送
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store } from "@/store";
import { User } from "@/domains/user";
import { Notify } from "@/domains/notify";
import { PushClientTypes } from "@/domains/notify/constants";
import { response_error_factory } from "@/utils/server";
import { BaseApiResp, Result } from "@/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { text, token1, token2, token3 } = req.body as Partial<{
    text: string;
    token1: string;
    token2: string;
    token3: string;
  }>;
  if (!text) {
    return e(Result.Err("请传入推送内容"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (token1) {
    const notify_res = await Notify.New({ type: PushClientTypes.PushDeer, token: token1, store });
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
    const notify_res = await Notify.New({ type: PushClientTypes.Telegram, token: token2, store });
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
  if (token3) {
    const notify_res = await Notify.New({ type: PushClientTypes.WXPush, token: token2, store });
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
