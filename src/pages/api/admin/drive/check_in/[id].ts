/**
 * @file 手动给指定云盘签到
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Drive } from "@/domains/drive";
import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id } = req.body as Partial<{ id: string }>;
  if (!drive_id) {
    return e("缺少云盘 id");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const { client } = drive;
  const r = await client.checked_in();
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "签到成功", data: null });
}
