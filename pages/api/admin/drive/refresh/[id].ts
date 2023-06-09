/**
 * @file 刷新指定云盘信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { User } from "@/domains/user";
import { bytes_to_size } from "@/utils";
import { store } from "@/store";
import { Drive } from "@/domains/drive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id } = req.query as Partial<{ id: string }>;
  if (!drive_id) {
    return e("缺少云盘 id");
  }
  const t = await User.New(authorization, store);
  if (t.error) {
    return e(t);
  }
  const { id: user_id } = t.data;
  const drive_res = await Drive.Get({ id: drive_id, user_id, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const r = await drive.refresh_profile();
  if (r.error) {
    return e(r);
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
