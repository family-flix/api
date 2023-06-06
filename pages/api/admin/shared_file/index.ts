/**
 * @file 获取分享文件列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { AliyunDriveClient } from "@/domains/aliyundrive";
import { User } from "@/domains/user";
import { store } from "@/store";
import { response_error_factory } from "@/utils/backend";
import { BaseApiResp, Result } from "@/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    url,
    file_id: parent_file_id = "root",
    next_marker = "initial",
  } = req.query as Partial<{
    url: string;
    file_id: string;
    next_marker: string;
  }>;
  if (!url) {
    return e("缺少分享资源链接");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const first_drive_res = await store.find_drive({ user_id });
  if (first_drive_res.error) {
    return e(first_drive_res);
  }
  const drive = first_drive_res.data;
  if (!drive) {
    return e(Result.Err("请先添加一个云盘", 10002));
  }
  console.log(drive.name);
  const client_res = await AliyunDriveClient.Get({ drive_id: drive.drive_id, store });
  if (client_res.error) {
    return e(client_res);
  }
  const client = client_res.data;
  const r1 = await client.fetch_share_profile(url);
  if (r1.error) {
    if (r1.error.message.includes("share_link is cancelled by the creator")) {
      return e("分享链接被取消");
    }
    return e(r1);
  }
  const { share_id, share_title } = r1.data;
  if (parent_file_id === "root") {
    store.add_shared_files_safely({
      url,
      title: share_title,
      user_id,
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
