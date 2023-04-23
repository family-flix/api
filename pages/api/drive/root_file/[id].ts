/**
 * @file 设置网盘刮削根目录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { store } from "@/store/sqlite";
import { AliyunDriveClient } from "@/domains/aliyundrive";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{
    id: string;
  }>;
  const { root_folder_id } = req.body as Partial<{
    root_folder_id: string;
  }>;
  if (!id) {
    return e("Missing drive id");
  }
  if (!root_folder_id) {
    return e("缺少 root_folder_id 参数");
  }
  const t_resp = parse_token(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const drive_res = await store.find_aliyun_drive({ id, user_id });
  if (drive_res.error) {
    return e(drive_res);
  }
  if (!drive_res.data) {
    return e("No matched record of drive");
  }
  const drive = new AliyunDriveClient({ drive_id: id, store });
  const file_res = await drive.fetch_file(root_folder_id);
  if (file_res.error) {
    return e(file_res.error.message);
  }
  const r2 = await store.update_aliyun_drive(id, {
    root_folder_id,
    root_folder_name: file_res.data.name,
  });
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({ code: 0, msg: "", data: { id: r2.data.id } });
}
