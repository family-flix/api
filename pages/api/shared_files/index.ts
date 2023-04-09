/**
 * @file 获取分享的文件列表
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
    return e("缺少分享链接参数");
  }
  const t_res = parse_token(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const drives_resp = await store.find_aliyun_drives({ user_id });
  if (drives_resp.error) {
    return e(drives_resp);
  }
  if (drives_resp.data.length === 0) {
    return e("Please add drive first");
  }
  const drive = drives_resp.data[0];
  const client = new AliyunDriveClient({ drive_id: drive.id, store });
  const r1 = await client.prepare_fetch_shared_files(url);
  if (r1.error) {
    return r1;
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
