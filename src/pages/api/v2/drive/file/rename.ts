/**
 * @file 重命名指定文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/v2";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_drive_file_rename(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { drive_id, file_id, name } = req.body as Partial<{ name: string; drive_id: string; file_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  if (!file_id) {
    return e(Result.Err("缺少文件 id"));
  }
  if (!name) {
    return e(Result.Err("缺少新的文件名"));
  }
  const user = t_res.data;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(Result.Err(drive_res.error.message));
  }
  const drive = drive_res.data;
  const r = await drive.rename_file({ file_id }, { name });
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  return res.status(200).json({ code: 0, msg: "重命名成功", data: null });
}
