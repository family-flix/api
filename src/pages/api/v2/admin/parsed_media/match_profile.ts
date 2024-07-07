/**
 * @file 匹配所有没有关联详情的解析记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/v2";
import { TaskTypes } from "@/domains/job/constants";
import { MediaSearcher } from "@/domains/searcher/v2";
import { Job } from "@/domains/job/index";
import { response_error_factory } from "@/utils/server";
import { Result } from "@/domains/result/index";

export default async function v2_admin_parsed_media_match_profile(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { drive_id, force = 1 } = req.body as Partial<{ drive_id: string; force: number }>;
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
  if (!drive.has_root_folder()) {
    return e(Result.Err("请先设置索引目录", 30001));
  }
  const searcher_res = await MediaSearcher.New({
    drive,
    user,
    store,
    force: Boolean(force),
    assets: app.assets,
    on_print(v) {
      job.output.write(v);
    },
  });
  if (searcher_res.error) {
    return e(Result.Err(searcher_res.error.message));
  }
  const searcher = searcher_res.data;
  const job_res = await Job.New({
    desc: `云盘「${drive.name}」影视剧搜索详情信息`,
    type: TaskTypes.SearchMedia,
    unique_id: drive.id,
    user_id: user.id,
    app,
    store,
  });
  if (job_res.error) {
    return e(Result.Err(job_res.error.message));
  }
  const job = job_res.data;
  searcher.on_percent((percent) => {
    job.update_percent(percent);
  });
  job.on_pause(() => {
    searcher.stop();
  });
  (async () => {
    await searcher.run();
    job.finish();
  })();
  return res.status(200).json({
    code: 0,
    msg: "开始搜索任务",
    data: {
      job_id: job.id,
    },
  });
}
