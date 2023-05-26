/**
 * @file 全量索引云盘（支持传入文件夹 id 表示仅索引该文件夹）
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { DriveAnalysis } from "@/domains/analysis";
import { Job } from "@/domains/job";
import { response_error_factory } from "@/utils/backend";
import { BaseApiResp, Result } from "@/types";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id } = req.query as Partial<{
    id: string;
    target_folder: string;
  }>;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id } = user;
  const drive_res = await Drive.Get({ id: drive_id, user_id, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  if (!drive.has_root_folder()) {
    return e(Result.Err("请先设置索引目录", "30001"));
  }
  const job_res = await Job.New({ desc: `索引云盘 '${drive.name}'`, unique_id: drive.id, user_id, store });
  if (job_res.error) {
    // article.write(
    //   new ArticleLineNode({
    //     type: "error",
    //     children: [
    //       new ArticleLineNode({
    //         type: "a",
    //         children: [`[${drive_id}]`, "有进行中的索引任务，点击前往查看"],
    //         value: {
    //           task_id: existing_task_res.data.id,
    //         },
    //       }),
    //     ],
    //   })
    // );
    return e(job_res);
  }
  const job = job_res.data;
  const r2 = await DriveAnalysis.New({
    drive,
    store,
    user,
    TMDB_TOKEN: process.env.TMDB_TOKEN,
    on_print(v) {
      job.output.write(v);
    },
    on_finish() {
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
  analysis.run();
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      job_id: job.id,
    },
  });
}
