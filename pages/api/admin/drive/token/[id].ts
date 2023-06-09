/**
 * @file 设置指定云盘的 refresh_token
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id } = req.query as Partial<{ id: string }>;
  const { refresh_token } = req.body as Partial<{ refresh_token: string }>;
  if (!drive_id) {
    return e("缺少云盘 id");
  }
  if (!refresh_token) {
    return e("缺少 refresh_token");
  }
  const t_resp = await User.New(authorization, store);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const drive_res = await Drive.Get({ id: drive_id, user_id, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const drive_token_res = await store.find_aliyun_drive_token({
    drive_id: drive.id,
  });
  if (drive_token_res.error) {
    return e(drive_token_res);
  }
  const drive_token = drive_token_res.data;
  if (!drive_token) {
    return e("该云盘没有 token 记录");
  }
  const r2 = await store.update_aliyun_drive_token(drive_token.id, {
    refresh_token,
  });
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({ code: 0, msg: "修改 refresh_token 成功", data: null });
}
