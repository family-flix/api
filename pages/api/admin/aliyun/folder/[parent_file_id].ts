/**
 * @file 阿里云盘 获取文件列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { BaseApiResp, Result } from "@/types";
import { store } from "@/store";
import { response_error_factory } from "@/utils/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { parent_file_id, drive_id } = req.query as Partial<{
    parent_file_id: string;
    drive_id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const { error, data } = await drive.client.fetch_files(parent_file_id as string);
  if (error) {
    res.status(200).json({ code: 1003, msg: error.message, data: null });
    return;
  }
  res.status(200).json({ code: 0, msg: "", data });
}
