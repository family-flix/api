/**
 * @file 分析分享的文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { analysis_shared_files } from "@/domains/walker/analysis_shared_files";
import { store } from "@/store/sqlite";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { url } = req.query as Partial<{ url: string }>;
  if (!url) {
    return e("Missing url");
  }
  const t_resp = parse_token(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const drives_resp = await store.find_aliyun_drives({ user_id });
  if (drives_resp.error) {
    return e(drives_resp);
  }
  if (drives_resp.data.length === 0) {
    return e("Please add drive first");
  }
  const task_resp = await analysis_shared_files(
    url,
    {
      user_id,
      /** 使用哪个盘获取分享文件信息 */
      drive_id: drives_resp.data[0].id,
    },
    store.operation
  );
  if (task_resp.error) {
    return e(task_resp);
  }
  const task = task_resp.data;
  if (!task) {
    return e("No matched record of async_task");
  }
  // store.add_shared_files_safely({
  //   url,
  //   user_id,
  //   title: task.share_title,
  // });
  res.status(200).json({ code: 0, msg: "", data: task_resp.data });
}
