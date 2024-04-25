/**
 * @file 刷新指定云盘基本信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { bytes_to_size } from "@/utils";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id } = req.body as Partial<{ id: string }>;
  const t = await User.New(authorization, store);
  if (t.error) {
    return e(Result.Err(t.error.message));
  }
  const user = t.data;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(Result.Err(drive_res.error.message));
  }
  const drive = drive_res.data;
  const r = await drive.refresh_profile();
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const { used_size, total_size } = r.data;
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      ...r.data,
      used_size,
      total_size,
      used_size_text: bytes_to_size(used_size || 0),
      total_size_text: bytes_to_size(total_size || 0),
    },
  });
}
