/**
 * @file 阿里云盘获取文件详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { file_id, user_id, drive_id } = req.query as Partial<{
    file_id: string;
    user_id: string;
    drive_id: string;
  }>;
  if (!drive_id) {
    return e("缺少云盘 id");
  }
  const drive_res = await store.find_drive({ id: drive_id });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  if (!drive) {
    return e("没有匹配的云盘记录");
  }
  const client_res = await AliyunDriveClient.Get({ drive_id: drive.drive_id, store });
  if (client_res.error) {
    return e(client_res);
  }
  const client = client_res.data;
  const { error, data } = await client.fetch_file(file_id as string);
  if (error) {
    return e(error);
  }
  res.status(200).json({ code: 0, msg: "", data });
}
