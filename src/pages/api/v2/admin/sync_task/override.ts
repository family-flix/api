/**
 * @file 管理后台/给指定的同步任务关联分享资源
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { ResourceSyncTask } from "@/domains/resource_sync_task/v2";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_sync_task_override(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, url, pwd, resource_file_id, resource_file_name } = req.body as Partial<{
    id: string;
    url: string;
    pwd: string;
    resource_file_id: string;
    resource_file_name: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少同步任务 id"));
  }
  if (!url) {
    return e(Result.Err("缺少资源 url"));
  }
  const r1 = await ResourceSyncTask.Get({ id, assets: app.assets, ignore_invalid: true, user, store });
  if (r1.error) {
    return e(Result.Err(r1.error.message));
  }
  const task = r1.data;
  const r2 = await task.override({
    url,
    pwd,
    resource_file_id,
    resource_file_name,
  });
  if (r2.error) {
    return e(Result.Err(r2.error.message));
  }
  return res.status(200).json({ code: 0, msg: "更新成功", data: null });
}
