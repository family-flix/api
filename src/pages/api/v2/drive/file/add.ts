/**
 * @file 给指定云盘的指定文件夹内，添加一个新文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/index";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_drive_file_add(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    id: drive_id,
    parent_file_id = "root",
    name,
  } = req.body as Partial<{
    id: string;
    parent_file_id: string;
    name: string;
  }>;
  const { authorization } = req.headers;
  const t = await User.New(authorization, store);
  if (t.error) {
    return e(t);
  }
  const user = t.data;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  if (!name) {
    return e(Result.Err("缺少文件夹名称"));
  }
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const r = await drive.client.create_folder({
    parent_file_id,
    name,
  });
  if (r.error) {
    return e(r);
  }
  return res.status(200).json({ code: 0, msg: "新增文件夹成功", data: r.data });
}
