/**
 * @file 设置指定云盘的 refresh_token
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const { refresh_token } = req.body as Partial<{ refresh_token: string }>;
  if (!id) {
    return e("缺少云盘 id 参数");
  }
  if (!refresh_token) {
    return e("缺少 refresh_token");
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
    return e("没有找到匹配的云盘记录");
  }
  const r = await store.find_aliyun_drive_token({
    drive_id: drive_res.data.id,
  });
  if (r.error) {
    return e(r);
  }
  if (!r.data) {
    return e("没有找到匹配的云盘记录");
  }
  const r2 = await store.update_aliyun_drive_token(r.data.id, {
    refresh_token,
  });
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({ code: 0, msg: "", data: { id: r2.data.id } });
}
