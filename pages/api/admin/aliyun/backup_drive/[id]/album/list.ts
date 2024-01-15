/**
 * @file 获取阿里云盘 相册列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { AliyunDriveClient } from "@/domains/aliyundrive";
import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: backup_drive_id } = req.query as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!backup_drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const client_res = await AliyunDriveClient.Get({ drive_id: backup_drive_id, store });
  if (client_res.error) {
    return e(client_res);
  }
  const client = client_res.data;
  const data_res = await client.fetch_album_list();
  if (data_res.error) {
    return e(data_res);
  }
  const data = data_res.data;
  res.status(200).json({ code: 0, msg: "", data });
}
