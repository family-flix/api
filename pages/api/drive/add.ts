/**
 * @file 添加阿里云盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { store } from "@/store/sqlite";

function parse_json<T>(content?: string) {
  if (!content) {
    return Result.Err("Missing content");
  }
  try {
    return Result.Ok(JSON.parse(content) as T);
  } catch (err) {
    const error = err as Error;
    return Result.Err(error);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_resp = parse_token(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const { payload } = req.body as Partial<{ payload: string }>;
  const json_resp = parse_json<{
    app_id: string;
    drive_id: string;
    device_id: string;
    access_token: string;
    refresh_token: string;
    avatar: string;
    nick_name: string;
    aliyun_user_id: string;
    user_name: string;
    root_folder_id?: string;
    total_size?: number;
    used_size?: number;
  }>(payload);
  if (json_resp.error) {
    return e(json_resp);
  }
  const {
    app_id,
    drive_id,
    device_id,
    avatar,
    nick_name,
    aliyun_user_id,
    user_name,
    root_folder_id,
    total_size,
    used_size,
    access_token,
    refresh_token,
  } = json_resp.data;
  const existing_drive_res = await store.find_aliyun_drive({ aliyun_user_id });
  if (existing_drive_res.error) {
    return e(existing_drive_res);
  }
  if (existing_drive_res.data) {
    return e("该云盘已存在，请检查信息后重试");
  }
  const adding_aliyun_drive_resp = await store.add_aliyun_drive({
    user_id,
    app_id,
    drive_id,
    device_id,
    avatar,
    nick_name,
    aliyun_user_id,
    user_name,
    root_folder_id,
    total_size,
    used_size,
  });
  if (adding_aliyun_drive_resp.error) {
    return e(adding_aliyun_drive_resp);
  }
  const adding_aliyun_drive_token_res = await store.add_aliyun_drive_token({
    aliyun_drive_id: adding_aliyun_drive_resp.data.id,
    access_token,
    refresh_token,
  });
  if (adding_aliyun_drive_token_res.error) {
    return e(adding_aliyun_drive_token_res);
  }
  const drive = adding_aliyun_drive_token_res.data;
  const client = new AliyunDriveClient({
    drive_id: drive.id,
    store: store,
  });
  await client.refresh_profile();
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      id: drive.id,
      avatar,
      nick_name,
      total_size,
      used_size,
    },
  });
}
