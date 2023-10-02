/**
 * @file 获取分享文件列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { AliyunBackupDriveClient } from "@/domains/aliyundrive";
import { User } from "@/domains/user";
import { store } from "@/store";
import { response_error_factory } from "@/utils/server";
import { BaseApiResp, Result } from "@/types";
import { parseJSONStr } from "@/utils";
import { AliyunDriveProfile } from "@/domains/aliyundrive/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    url,
    code,
    file_id: parent_file_id = "root",
    next_marker = "initial",
  } = req.query as Partial<{
    url: string;
    code: string;
    file_id: string;
    next_marker: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!url) {
    return e(Result.Err("缺少分享资源链接"));
  }
  const user = t_res.data;
  const first_drive_res = await store.find_drive({ user_id: user.id });
  if (first_drive_res.error) {
    return e(first_drive_res);
  }
  const drive = first_drive_res.data;
  if (!drive) {
    return e(Result.Err("请先添加一个云盘", 10002));
  }
  const p_res = parseJSONStr<AliyunDriveProfile>(drive.profile);
  if (p_res.error) {
    return e(p_res);
  }
  const { drive_id } = p_res.data;
  const client_res = await AliyunBackupDriveClient.Get({ drive_id: String(drive_id), store });
  if (client_res.error) {
    return e(client_res);
  }
  const client = client_res.data;
  const r1 = await client.fetch_share_profile(url, {
    code,
  });
  if (r1.error) {
    if (r1.error.message.includes("share_link is cancelled by the creator")) {
      return e(Result.Err("分享链接被取消"));
    }
    return e(r1);
  }
  const { share_id, share_title } = r1.data;
  if (parent_file_id === "root") {
    store.add_shared_files_safely({
      url,
      title: share_title,
      user_id: user.id,
    });
  }
  const r2 = await client.fetch_shared_files(parent_file_id, {
    marker: next_marker,
    share_id,
  });
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: r2.data,
  });
}
