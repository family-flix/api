/**
 * @file 从分享资源中转存差异内容
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { patch_tv_in_progress } from "@/domains/walker/run_tv_sync_task";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { url, file_id, file_name } = req.query as Partial<{
    /** 分享链接 */
    url: string;
    /** 分享的文件 file_id */
    file_id: string;
    /** 分享的文件名 */
    file_name: string;
  }>;
  if (!url) {
    return e("缺少分享链接参数");
  }
  if (!file_id) {
    return e("请指定要分析的文件");
  }
  if (!file_name) {
    return e("请传入要分析的文件名称");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const drive_res = await store.find_drive({ user_id });
  if (drive_res.error) {
    return e(drive_res);
  }
  if (!drive_res.data) {
    return e("当前没有网盘，请先添加一个网盘");
  }
  const drive = drive_res.data;
  const same_name_folder_res = await (async () => {
    const r2 = await store.find_shared_file_save({
      url,
      file_id,
      target_file_id: "not null",
    });
    if (r2.error) {
      return Result.Err(r2.error);
    }
    if (!r2.data) {
      return Result.Err("请先关联网盘内同名文件夹");
    }
    const r3 = await store.find_file({
      file_id: r2.data.target_file_id,
      user_id,
    });
    if (!r3.data) {
      return Result.Err("连载记录没有匹配的文件夹");
    }
    const target_folder = r3.data;
    return Result.Ok({
      name: r2.data.name,
      target_folder_name: target_folder.name,
      target_folder_id: r3.data.file_id,
      drive_id: r3.data.drive_id,
    });
  })();
  // console.log("[]same_name_folder_res", same_name_folder_res.data);
  if (same_name_folder_res.error) {
    return e(same_name_folder_res);
  }
  if (!same_name_folder_res.data) {
    return e("没有同名文件夹，请先查找是否存在同名文件夹并建立关联");
  }
  const { name, target_folder_id, target_folder_name, drive_id } = same_name_folder_res.data;
  const r = await patch_tv_in_progress(
    {
      url,
      file_name: name,
      file_id,
      target_folder_id,
      target_folder_name,
    },
    {
      user_id,
      drive_id,
      store,
    }
  );
  if (r.error) {
    return e(r);
  }
  // 存在同名文件夹，和已存在的进行对比（如果文件总数超过 50 就终止）
  res.status(200).json({
    code: 0,
    msg: "",
    data: r.data,
  });
}
