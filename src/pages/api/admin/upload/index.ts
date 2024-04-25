/**
 * @file 上传文件
 */
import fs from "fs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Drive } from "@/domains/drive/index";
import { User } from "@/domains/user/index";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v0_admin_upload(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { drive_id, files } = req.body as Partial<{ drive_id: string; files: File[] }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!drive_id) {
    return e(Result.Err("请指定上传至哪个云盘"));
  }
  if (!files) {
    return e(Result.Err("请选择要上传的文件"));
  }
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const client = drive_res.data.client;
  const file = files[0];
  if (!file) {
    return e(Result.Err("没有文件"));
  }
  const { name } = file;
  // const file_buffer = fs.readFileSync(filepath);
  const correct_filename = name;
  // console.log("upload", filepath, file_name);
  // const r = await client.upload(filepath, {
  //   name: correct_filename,
  //   parent_file_id: "root",
  // });
  // if (r.error) {
  //   return e(r);
  // }
  return res.status(200).json({ code: 0, msg: "上传成功", data: null });
}
