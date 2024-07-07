/**
 * @file 刷新指定云盘基本信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/index";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";
import { bytes_to_size } from "@/utils/index";

export default async function v2_admin_drive_refresh(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id } = req.body as Partial<{ id: string }>;
  const t = await User.New(authorization, store);
  if (t.error) {
    return e(t);
  }
  const user = t.data;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const r = await drive.refresh_profile();
  if (r.error) {
    return e(r);
  }
  const { used_size, total_size, ...rest } = r.data;
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      ...rest,
      used_size,
      total_size,
      used_size_text: bytes_to_size(used_size || 0),
      total_size_text: bytes_to_size(total_size || 0),
    },
  });
}
