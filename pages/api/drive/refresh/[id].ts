/**
 * @file 刷新指定云盘信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { User } from "@/domains/user";

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
  const t = await User.New(authorization);
  if (t.error) {
    return e(t);
  }
  const user = t.data;
  const d = await user.get_drive(drive_id);
  if (d.error) {
    return e(d);
  }
  const drive = d.data;
  const r = await drive.refresh_profile();
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: r.data });
}
