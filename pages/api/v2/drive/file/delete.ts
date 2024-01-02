/**
 * @file 删除指定文件或文件夹
 * 1、关联的解析结果等也会被删除
 * 2、但是搜索到的详情不会删除，只会剩下没有可播放文件的影视剧记录
 * 3、没有可播放的影视剧记录在C端不会展示
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { User } from "@/domains/user";
import { Drive } from "@/domains/drive/v2";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id, drive_id } = req.body as Partial<{
    file_id: string;
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
  if (!file_id) {
    return e(Result.Err("缺少文件 id"));
  }
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const r = await drive.delete_file_or_folder_in_drive(file_id);
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  res.status(200).json({
    code: 0,
    msg: "删除成功",
    data: null,
  });
}
