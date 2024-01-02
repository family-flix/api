/**
 * @file 阿里云盘获取文件详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Drive } from "@/domains/drive";
import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id, drive_id } = req.query as Partial<{
    file_id: string;
    drive_id: string;
  }>;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
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
  if (!drive) {
    return e(Result.Err("没有匹配的云盘记录"));
  }
  const client = drive.client;
  const { error, data } = await client.fetch_file(file_id as string);
  if (error) {
    return e(error);
  }
  res.status(200).json({ code: 0, msg: "", data });
}
