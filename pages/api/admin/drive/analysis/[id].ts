/**
 * @file 全量索引云盘（支持传入文件夹 id 表示仅索引该文件夹）
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store/index";
import { TaskTypes } from "@/domains/job/constants";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/index";
import { DriveAnalysis } from "@/domains/analysis/index";
import { Job } from "@/domains/job/index";
import { ArticleLineNode, ArticleTextNode } from "@/domains/article/index";
import { response_error_factory } from "@/utils/server";
import { BaseApiResp, Result } from "@/types/index";
import { FileType } from "@/constants/index";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id, force } = req.query as Partial<{
    id: string;
    force: string;
  }>;
  const { target_folders } = req.body as Partial<{
    target_folders: { file_id: string; parent_paths?: string; name: string; type: string }[];
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const user = t_res.data;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  if (!target_folders && !drive.has_root_folder()) {
    return e(Result.Err("请先设置索引目录", 30001));
  }
  const job_res = await Job.New({
    desc: `索引云盘「${drive.name}」${(() => {
      if (!target_folders) {
        return "";
      }
      if (!Array.isArray(target_folders)) {
        return "";
      }
      if (target_folders.length === 1) {
        return target_folders[0].name;
      }
      return " 部分文件";
    })()}`,
    type: TaskTypes.DriveAnalysis,
    unique_id: drive.id,
    user_id: user.id,
    app,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  const r2 = await DriveAnalysis.New({
    drive,
    store,
    user,
    assets: app.assets,
    on_print(v) {
      job.output.write(v);
    },
    on_finish() {
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
  async function run() {
    const the_files_prepare_analysis = await (async () => {
      if (!target_folders) {
        return undefined;
      }
      if (!Array.isArray(target_folders)) {
        return undefined;
      }
      if (target_folders && target_folders[0] && target_folders[0].parent_paths) {
        return target_folders.map((f) => {
          const { name, parent_paths, type } = f;
          return {
            name: [parent_paths, name].filter(Boolean).join("/"),
            type,
          };
        });
      }
      const files = await store.prisma.file.findMany({
        where: {
          name: {
            in: target_folders.map((f) => f.name),
          },
        },
      });
      return files.map((f) => {
        const { name, parent_paths, type } = f;
        return {
          name: [parent_paths, name].filter(Boolean).join("/"),
          type: type === FileType.File ? "file" : "folder",
        };
      });
    })();
    await analysis.run(the_files_prepare_analysis, { force: force === "1" });
  }
  run();
  res.status(200).json({
    code: 0,
    msg: "开始索引任务",
    data: {
      job_id: job.id,
    },
  });
}
