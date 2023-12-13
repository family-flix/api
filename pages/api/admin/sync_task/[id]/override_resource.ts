/**
 * @file 管理后台/给指定的同步任务关联分享资源
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ResourceSyncTask } from "@/domains/resource_sync_task";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const { url, resource_file_id, resource_file_name } = req.body as Partial<{
    url: string;
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
  const t_r1 = await ResourceSyncTask.Get({ id, assets: app.assets, ignore_invalid: true, user, store });
  if (t_r1.error) {
    return e(Result.Err(t_r1.error.message));
  }
  const task = t_r1.data;
  const r = await task.override({
    url,
    resource_file_id,
    resource_file_name,
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "更新成功", data: {} });
}
