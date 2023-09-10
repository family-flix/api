/**
 * @file 将指定云盘的指定文件，移动到另一个云盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Job } from "@/domains/job";
import { DriveAnalysis } from "@/domains/analysis";
import { ArticleLineNode, ArticleTextNode } from "@/domains/article";
import { Drive } from "@/domains/drive";
import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { app, store } from "@/store";
import { FileType } from "@/constants";
import { file } from "@prisma/client";
import { TaskTypes } from "@/domains/job/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id, target_drive_id, source_drive_id } = req.body as Partial<{
    file_id: string;
    source_drive_id: string;
    target_drive_id: string;
  }>;
  if (!source_drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  if (!target_drive_id) {
    return e(Result.Err("缺少目标云盘 id"));
  }
  if (!file_id) {
    return e(Result.Err("缺少要移动的文件 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id, settings } = user;
  const source_drive_res = await Drive.Get({ id: source_drive_id, user, store });
  if (source_drive_res.error) {
    return e(source_drive_res);
  }
  const source_drive = source_drive_res.data;
  const target_drive_res = await Drive.Get({ id: target_drive_id, user, store });
  if (target_drive_res.error) {
    return e(target_drive_res);
  }
  const target_drive = target_drive_res.data;
  if (!target_drive.has_root_folder()) {
    return e(Result.Err("请先设置目标云盘索引目录", 30001));
  }
  const r = await source_drive.client.move_files_to_drive_with_quick({
    file_ids: [file_id],
    target_drive_client: target_drive.client,
    target_folder_id: "root",
  });
  if (r.error) {
    return Result.Err(r);
  }
  const r2 = await source_drive.client.to_trash(file_id);
  if (r2.error) {
    return Result.Err(r2);
  }
  const children_files = await find_children_files(file_id);
  await store.prisma.file.deleteMany({
    where: {
      file_id: {
        in: children_files.map((file) => file.file_id),
      },
    },
  });
  const job_res = await Job.New({
    desc: `移动文件后索引云盘 '${target_drive.name}'`,
    unique_id: target_drive.id,
    type: TaskTypes.TVTransfer,
    user_id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  const r3 = await DriveAnalysis.New({
    drive: target_drive,
    store,
    user,
    tmdb_token: settings.tmdb_token,
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
  if (r3.error) {
    return e(r3);
  }
  const analysis = r3.data;
  // console.log("[API]admin/drive/transfer/index.ts - before await analysis.run");
  const r4 = await analysis.run([{ name: r.data.file_name, type: "folder" }], {
    force: true,
  });
  if (r4.error) {
    return e(r4);
  }
  res.status(200).json({ code: 0, msg: "移动文件成功", data: null });
}

async function find_children_files(file_id: string, descendants: file[] = []) {
  const files = await store.prisma.file.findMany({
    where: {
      parent_file_id: file_id,
    },
  });
  const folders = files.filter((file) => {
    const { type } = file;
    return type === FileType.Folder;
  });
  descendants.push(...files);
  for (const folder of folders) {
    await find_children_files(folder.file_id, descendants);
  }
  return descendants;
}
