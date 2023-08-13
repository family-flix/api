/**
 * @file 导出一个云盘信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { parseJSONStr } from "@/utils";
import { DriveTypes } from "@/domains/drive/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少云盘 id");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const drive_res = await store.find_drive({ id, user_id });
  if (drive_res.error) {
    return e(drive_res);
  }

  const drive_record = drive_res.data;
  if (!drive_record) {
    return e("没有匹配的云盘记录");
  }
  const { type, profile, avatar, name, root_folder_id, total_size, used_size } = drive_record;

  const data_res = await (async () => {
    if (type === DriveTypes.Aliyun) {
      const p_res = await parseJSONStr(profile);
      if (p_res.error) {
        return Result.Err(p_res.error);
      }
      const { app_id, drive_id, device_id, aliyun_user_id } = p_res.data;
      const drive_token_res = await store.find_aliyun_drive_token({
        drive_id: drive_record.id,
      });
      if (drive_token_res.error) {
        return Result.Err(drive_token_res.error);
      }
      if (!drive_token_res.data) {
        return Result.Err("没有匹配的云盘凭证记录");
      }
      const { data } = drive_token_res.data;
      const d_res = await parseJSONStr(data);
      if (d_res.error) {
        return Result.Err(d_res.error);
      }
      const { access_token, refresh_token } = d_res.data;
      return Result.Ok({
        app_id,
        drive_id,
        device_id,
        avatar,
        name,
        aliyun_user_id,
        root_folder_id,
        total_size,
        used_size,
        access_token,
        refresh_token,
      });
    }
    return Result.Err("异常云盘信息");
  })();
  if (data_res.error) {
    return e(data_res);
  }
  const data = data_res.data;
  res.status(200).json({
    code: 0,
    msg: "导出成功",
    data,
  });
}
