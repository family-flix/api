/**
 * @file 设置云盘索引根目录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id } = req.query as Partial<{
    id: string;
  }>;
  const { root_folder_id } = req.body as Partial<{
    root_folder_id: string;
  }>;
  if (!drive_id) {
    return e("缺少云盘 id");
  }
  if (!root_folder_id) {
    return e("缺少文件夹 id");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const drive_res = await Drive.Get({ id: drive_id, user_id, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const { client } = drive;
  const file_res = await client.fetch_file(root_folder_id);
  if (file_res.error) {
    return e(file_res.error.message);
  }
  const r2 = await store.update_drive(drive_id, {
    root_folder_id,
    root_folder_name: file_res.data.name,
  });
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({ code: 0, msg: "设置索引目录成功", data: null });
}
