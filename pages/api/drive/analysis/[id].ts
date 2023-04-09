/**
 * @file 索引指定文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { analysis_aliyun_drive } from "@/domains/walker/analysis_aliyun_drive";
import { parse_token, response_error_factory } from "@/utils/backend";
import { store } from "@/store/sqlite";
import { AliyunDriveClient } from "@/domains/aliyundrive";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id, target_folder } = req.query as Partial<{
    id: string;
    target_folder: string;
  }>;
  if (!drive_id) {
    return e("Missing aliyun_drive_id");
  }
  const t_resp = parse_token(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const drive_res = await store.find_aliyun_drive({ id: drive_id, user_id });
  if (drive_res.error) {
    return e(drive_res);
  }
  if (!drive_res.data) {
    return e("No matched record of drive");
  }
  const { root_folder_id } = drive_res.data;
  const client = new AliyunDriveClient({
    drive_id,
    store,
  });
  const resp = await analysis_aliyun_drive({
    drive_id,
    user_id,
    client,
    files: target_folder
      ? [
          {
            name: target_folder,
            type: "folder",
          },
        ]
      : [],
    store,
    need_upload_image: true,
  });
  if (resp.error) {
    return e(resp);
  }
  res.status(200).json({ code: 0, msg: "", data: resp.data });
}
