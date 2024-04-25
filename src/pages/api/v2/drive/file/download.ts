/**
 * @file 下载指定文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/v2";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_drive_file_download(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
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
  const r = await drive.client.download(file_id);
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      url: r.data.url,
    },
  });
}
