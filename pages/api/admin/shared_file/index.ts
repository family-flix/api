/**
 * @file 获取分享文件列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { AliyunBackupDriveClient } from "@/domains/aliyundrive";
import { User } from "@/domains/user";
import { AliyunDriveClient, AliyunDriveProfile } from "@/domains/aliyundrive/types";
import { store } from "@/store";
import { response_error_factory } from "@/utils/server";
import { BaseApiResp, Result } from "@/types";
import { parseJSONStr } from "@/utils";

let cached_drive: null | AliyunDriveClient = null;

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
  const user = t_res.data;
  if (!url) {
    return e(Result.Err("缺少资源链接"));
  }
  const id_r = url.match(/\/s\/([0-9a-zA-Z]{11})/);
  if (!id_r) {
    return e(Result.Err("不是合法的资源链接"));
  }
  const share_id = id_r[1];
  const r = await (async () => {
    if (cached_drive) {
      return Result.Ok(cached_drive);
    }
    // 取第一个云盘用来获取分享文件列表，不涉及转存逻辑
    const first_drive_res = await store.find_drive({ user_id: user.id });
    if (first_drive_res.error) {
      return Result.Err(first_drive_res.error.message);
    }
    const drive = first_drive_res.data;
    if (!drive) {
      return Result.Err("请先添加一个云盘", 10002);
    }
    const p_res = parseJSONStr<AliyunDriveProfile>(drive.profile);
    if (p_res.error) {
      return Result.Err(p_res.error.message);
    }
    const { drive_id } = p_res.data;
    const client_res = await AliyunBackupDriveClient.Get({ drive_id: String(drive_id), store });
    if (client_res.error) {
      return Result.Err(client_res.error.message);
    }
    const client = client_res.data;
    cached_drive = client;
    return Result.Ok(client);
  })();
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const client = r.data;
  const r1 = await client.fetch_share_profile(url, {
    code,
  });
  if (r1.error) {
    if (r1.error.message.includes("share_link is cancelled by the creator")) {
      return Result.Err("分享链接被取消");
    }
    return Result.Err(r1.error.message);
  }
  const r2 = await client.fetch_shared_files(parent_file_id, {
    marker: next_marker,
    share_id,
  });
  if (r2.error) {
    return e(Result.Err(r2.error.message));
  }
  const data = r2.data;
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
