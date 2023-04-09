/**
 * @file 手动给指定网盘签到
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { store } from "@/store/sqlite";

const { find_aliyun_drive } = store;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id } = req.query as Partial<{ id: string }>;
  if (!drive_id) {
    return e("Missing drive id");
  }
  const t_resp = parse_token(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const drive_resp = await find_aliyun_drive({
    id: drive_id,
    user_id,
  });
  if (drive_resp.error) {
    return e(drive_resp);
  }
  const client = new AliyunDriveClient({
    drive_id,
    store: store,
  });
  const r = await client.checked_in();
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
