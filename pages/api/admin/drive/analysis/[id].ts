/**
 * @file 全量索引云盘（支持传入文件夹 id 表示仅索引该文件夹）
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { DriveAnalysis } from "@/domains/analysis";
import { Job } from "@/domains/job";
import { ArticleLineNode, ArticleTextNode } from "@/domains/article";
import { response_error_factory } from "@/utils/backend";
import { BaseApiResp, Result } from "@/types";
import { app, store } from "@/store";
import { TaskTypes } from "@/domains/job/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id, force } = req.query as Partial<{
    id: string;
    force: string;
  }>;
  const { target_folders } = req.body as Partial<{
    target_folders: { name: string; type: string }[];
  }>;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id, settings } = user;
  const drive_res = await Drive.Get({ id: drive_id, user_id, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  if (!drive.has_root_folder()) {
    return e(Result.Err("请先设置索引目录", 30001));
  }
  const job_res = await Job.New({
    desc: `索引云盘 '${drive.name}'`,
    type: TaskTypes.DriveAnalysis,
    unique_id: drive.id,
    user_id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  console.log("开始索引");
  const r2 = await DriveAnalysis.New({
    drive,
    store,
    user,
    tmdb_token: settings.tmdb_token,
    assets: app.assets,
    on_print(v) {
      job.output.write(v);
    },
    on_finish() {
      console.log("索引完成");
      job.output.write(
        new ArticleLineNode({
          children: [
            new ArticleTextNode({
              text: "索引完成",
            }),
          ],
        })
      );
      job.finish();
    },
    on_error() {
      job.finish();
    },
  });
  if (r2.error) {
    return e(r2);
  }
  const analysis = r2.data;
  // console.log("[API]admin/drive/analysis/[id].ts - before analysis.run");
  analysis.run(
    (() => {
      if (!target_folders) {
        return undefined;
      }
      if (!Array.isArray(target_folders)) {
        return undefined;
      }
      return target_folders;
    })(),
    { force: force === "1" }
  );
  res.status(200).json({
    code: 0,
    msg: "开始索引任务",
    data: {
      job_id: job.id,
    },
  });
}
