/**
 * @file 获取阿里云盘 相册文件列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { Drive } from "@/domains/drive";
import { AliyunDriveClient } from "@/domains/clients/alipan";

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
  const r = await AliyunDriveClient.Get({ unique_id: backup_drive_id, user, store });
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const client = r.data;
  const r2 = await client.fetch_rewards_v2();
  if (r2.error) {
    return e(Result.Err(r2.error.message));
  }
  const data = r2.data;
  res.status(200).json({ code: 0, msg: "", data });
}
