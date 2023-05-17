/**
 * @file 手动给指定网盘签到
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { AliyunDriveClient } from "@/domains/aliyundrive";
import { User } from "@/domains/user";
import { store } from "@/store";
import { response_error_factory } from "@/utils/backend";
import { BaseApiResp } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id } = req.query as Partial<{ id: string }>;
  if (!drive_id) {
    return e("缺少网盘 id 参数");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const drive_resp = await store.find_drive({
    id: drive_id,
    user_id,
  });
  if (drive_resp.error) {
    return e(drive_resp);
  }
  const client = new AliyunDriveClient({
    drive_id,
    store,
  });
  const r = await client.checked_in();
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
