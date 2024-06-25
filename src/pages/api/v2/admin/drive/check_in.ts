/**
 * @file 手动给指定云盘签到
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Drive } from "@/domains/drive";
import { User } from "@/domains/user";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_drive_check_in(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id } = req.body as Partial<{ id: string }>;
  const t = await User.New(authorization, store);
  if (t.error) {
    return e(t);
  }
  const user = t.data;
  if (!drive_id) {
    return e("缺少云盘 id");
  }
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const r = await drive.client.checked_in();
  if (r.error) {
    return e(r);
  }
  return res.status(200).json({ code: 0, msg: "签到成功", data: null });
}
