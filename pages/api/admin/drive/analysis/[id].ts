/**
 * @file 全量索引云盘（支持传入文件夹 id 表示仅索引该文件夹）
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { walk_drive } from "@/domains/walker/analysis_aliyun_drive";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { User } from "@/domains/user";
import { store } from "@/store";
import { response_error_factory } from "@/utils/backend";
import { BaseApiResp } from "@/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id, target_folder } = req.query as Partial<{
    id: string;
    target_folder: string;
  }>;
  if (!drive_id) {
    return e("缺少云盘 id 参数");
  }
  const t_resp = await User.New(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const drive_res = await store.find_drive({ id: drive_id });
  if (drive_res.error) {
    return e(drive_res);
  }
  if (!drive_res.data) {
    return e("没有找到匹配的云盘记录");
  }
  const { root_folder_id } = drive_res.data;
  const client = new AliyunDriveClient({
    drive_id,
    store,
  });
  const resp = await walk_drive({
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
