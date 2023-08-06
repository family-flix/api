/**
 * @file 阿里云盘 删除指定文件列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id, file_id } = req.query as Partial<{
    /** 云盘 id */
    id: string;
    /** 文件 id */
    file_id: string;
  }>;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  if (!file_id) {
    return e(Result.Err("缺少文件 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const drive_res = await Drive.Get({ id: drive_id, user_id: user.id, store });
  if (drive_res.error) {
    return e(drive_res.error);
  }
  const drive = drive_res.data;
  const r = await drive.client.delete_file(file_id);
  if (r.error) {
    return e(r.error);
  }
  await store.delete_file({
    file_id,
  });
  await store.delete_sync_task({
    file_id,
  });
  await store.delete_parsed_episode({
    file_id,
  });
  await store.delete_parsed_season({
    file_id,
  });
  await store.delete_parsed_tv({
    file_id,
  });
  await store.delete_parsed_movie({
    file_id,
  });
  res.status(200).json({ code: 0, msg: "删除文件成功", data: null });
}
