/**
 * @file 导出一个云盘信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { DriveTypes } from "@/domains/drive/constants";
import { AliyunDrivePayload } from "@/domains/clients/alipan/types";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";
import { parseJSONStr } from "@/utils/index";

export default async function v2_admin_drive_export(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const t = await User.New(authorization, store);
  if (t.error) {
    return e(t);
  }
  const user = t.data;
  if (!id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const drive_res = await store.find_drive({ id, user_id: user.id });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive_record = drive_res.data;
  if (!drive_record) {
    return e(Result.Err("没有匹配的云盘记录"));
  }
  const { type, profile, avatar, name, root_folder_id, total_size, used_size } = drive_record;
  const r = await (async () => {
    if (type === DriveTypes.AliyunBackupDrive) {
      const p_res = parseJSONStr<AliyunDrivePayload>(profile);
      if (p_res.error) {
        return Result.Err(p_res.error);
      }
      const { app_id, drive_id, device_id, user_id } = p_res.data;
      const drive_token_res = await store.find_aliyun_drive_token({
        id: drive_record.drive_token_id,
      });
      if (drive_token_res.error) {
        return Result.Err(drive_token_res.error);
      }
      if (!drive_token_res.data) {
        return Result.Err("没有匹配的云盘凭证记录");
      }
      const { data } = drive_token_res.data;
      const d_res = parseJSONStr<{ access_token: string; refresh_token: string }>(data);
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
        user_id,
        root_folder_id,
        total_size,
        used_size,
        access_token,
        refresh_token,
      });
    }
    if (type === DriveTypes.AliyunResourceDrive) {
      return Result.Err("请先创建备份盘，再创建资源盘");
    }
    return Result.Err("异常云盘信息");
  })();
  if (r.error) {
    return e(r);
  }
  const data = r.data;
  return res.status(200).json({
    code: 0,
    msg: "导出成功",
    data,
  });
}
