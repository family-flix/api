/**
 * @file 获取指定云盘、指定文件夹的子文件/文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/v2";
import { DriveTypes } from "@/domains/drive/constants";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_drive_file_list(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    drive_id,
    file_id,
    next_marker = "",
    page_size,
  } = req.body as Partial<{
    drive_id: string;
    file_id: string;
    next_marker: string;
    name: string;
    page_size: number;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(Result.Err(drive_res.error.message));
  }
  const drive = drive_res.data;
  if (name) {
    const r = await drive.client.search_files({
      name,
      type: "folder",
      marker: next_marker,
    });
    if (r.error) {
      return e(Result.Err(r.error.message));
    }
    return res.status(200).json({ code: 0, msg: "", data: r.data });
  }
  const id = (() => {
    if (file_id && file_id !== "root") {
      return file_id;
    }
    if (drive.profile.type === DriveTypes.AliyunBackupDrive) {
      return "root";
    }
    if (drive.profile.type === DriveTypes.AliyunResourceDrive) {
      return "root";
    }
    if (drive.profile.type === DriveTypes.LocalFolder) {
      return "root";
    }
    if (drive.profile.type === DriveTypes.Cloud189Drive) {
      return "-11";
    }
    if (drive.profile.type === DriveTypes.QuarkDrive) {
      return "0";
    }
    return null;
  })();
  if (!id) {
    return e(Result.Err("缺少文件 id"));
  }
  const r = await drive.client.fetch_files(id, {
    marker: next_marker,
    page_size,
  });
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  return res.status(200).json({ code: 0, msg: "", data: r.data });
}
