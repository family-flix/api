/**
 * @file 更新指定云盘信息
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
  const { id } = req.query as Partial<{ id: string }>;
  const body = req.body as Partial<{
    root_folder_id: string;
    root_folder_name: string;
  }>;
  const t = await User.New(authorization);
  if (t.error) {
    return e(t.error);
  }
  const user = t.data;
  const r1 = await user.get_drive(id);
  if (r1.error) {
    return e(r1);
  }
  const drive = r1.data;
  const r2 = await drive.set_root_folder(body);
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
