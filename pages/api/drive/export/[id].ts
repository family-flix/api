/**
 * @file 导出一个云盘信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("Missing drive id");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const drive_res = await store.find_drive({ id, user_id });
  if (drive_res.error) {
    return e(drive_res);
  }
  if (!drive_res.data) {
    return e("No matched record of drive");
  }
  const drive_token_res = await store.find_aliyun_drive_token({
    drive_id: drive_res.data.id,
  });
  if (drive_token_res.error) {
    return e(drive_token_res);
  }
  if (!drive_token_res.data) {
    return e("No matched record of drive");
  }
  const {
    app_id,
    drive_id,
    device_id,
    aliyun_user_id,
    avatar,
    nick_name,
    user_name,
    root_folder_id,
    total_size,
    used_size,
  } = drive_res.data;
  const { access_token, refresh_token } = drive_token_res.data;
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      app_id,
      drive_id,
      device_id,
      avatar,
      nick_name,
      user_name,
      aliyun_user_id,
      root_folder_id,
      total_size,
      used_size,
      access_token,
      refresh_token,
    },
  });
}
