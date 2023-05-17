/**
 * @file 获取指定网盘详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const { refresh_token } = req.body as Partial<{ refresh_token: string }>;
  if (!id) {
    return e("Missing drive id");
  }
  if (!refresh_token) {
    return e("Missing refresh_token");
  }
  const t_resp = await User.New(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const drive_res = await store.find_drive({ id, user_id });
  if (drive_res.error) {
    return e(drive_res);
  }
  if (!drive_res.data) {
    return e("No matched record of drive");
  }
  const r = await store.find_aliyun_drive_token({
    drive_id: drive_res.data.id,
  });
  if (r.error) {
    return e(r);
  }
  if (!r.data) {
    return e("No matched record of drive");
  }
  const r2 = await store.update_aliyun_drive_token(r.data.id, {
    refresh_token,
  });
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({ code: 0, msg: "", data: { id: r2.data.id } });
}
