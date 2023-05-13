/**
 * @file 手动更新指定分享文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { patch_serialized_shared_folder } from "@/domains/walker/utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少更新分享文件任务 id");
  }
  const t_res = parse_token(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const task_res = await store.find_shared_files_in_progress({ id, user_id });
  if (task_res.error) {
    return e(task_res);
  }
  if (!task_res.data) {
    return e("No matched record of shared_files_in_progress");
  }
  const task = task_res.data;
  const r = await patch_serialized_shared_folder(task, store);
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: r.data });
}
