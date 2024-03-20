/**
 * @file 转存分享资源到指定云盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store/index";
import { User } from "@/domains/user/index";
import { BaseApiResp, Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { ResourceSyncTask } from "@/domains/resource_sync_task/v2";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { url, code, file_id, file_name, drive_id } = req.body as Partial<{
    /** 分享资源链接 */
    url: string;
    /** 分享资源密码 */
    code: string;
    /** 要转存的分享文件的 file_id */
    file_id: string;
    /** 要转存的分享文件的名称 */
    file_name: string;
    /** 转存到哪个云盘 */
    drive_id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!url) {
    return e(Result.Err("缺少分享资源链接"));
  }
  if (!file_id) {
    return e(Result.Err("请指定要转存的文件"));
  }
  if (!file_name) {
    return e(Result.Err("请传入转存文件名称"));
  }
  if (!drive_id) {
    return e(Result.Err("请指定转存到哪个网盘"));
  }
  const r = await ResourceSyncTask.Transfer(
    {
      url,
      pwd: code,
      file_id,
      file_name,
      drive_id,
    },
    {
      user,
      app,
      store,
    }
  );
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  res.status(200).json({
    code: 0,
    msg: "开始转存",
    data: {
      job_id: r.data.job_id,
    },
  });
}
