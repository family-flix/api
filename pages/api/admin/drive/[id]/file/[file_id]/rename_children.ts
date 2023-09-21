/**
 * @file 重命名指定文件的所有子文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { Drive } from "@/domains/drive";
import { Folder } from "@/domains/folder";
import { Job, TaskTypes } from "@/domains/job";
import { ArticleLineNode, ArticleTextNode } from "@/domains/article";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, file_id: folder_id } = req.query as Partial<{ id: string; file_id: string }>;
  const { regexp, replace } = req.body as Partial<{ regexp: string; replace: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少云盘 id"));
  }
  if (!folder_id) {
    return e(Result.Err("缺少文件 file_id"));
  }
  if (!regexp) {
    return e(Result.Err("缺少正则"));
  }
  if (!replace) {
    return e(Result.Err("缺少替换内容"));
  }
  const user = t_res.data;
  const drive_res = await Drive.Get({ id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const job_res = await Job.New({
    type: TaskTypes.RenameFiles,
    desc: "重命名子文件列表",
    unique_id: [id, folder_id].join("/"),
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  const folder = new Folder(folder_id, {
    client: drive.client,
  });
  async function run(values: { file_id: string; regexp: string; replace: string }) {
    const { file_id, regexp, replace } = values;
    job.output.write(
      new ArticleLineNode({
        children: ["开始重命名"].map((text) => new ArticleTextNode({ text })),
      })
    );
    let count = 0;
    do {
      if (count >= 6) {
        folder.next_marker = "";
      }
      await (async () => {
        const r = await folder.next();
        // console.log(1, r.error);
        if (r.error) {
          job.output.write(
            new ArticleLineNode({
              children: ["请求失败", r.error.message].map((text) => new ArticleTextNode({ text })),
            })
          );
          count += 1;
          return;
        }
        const result = r.data;
        // console.log(2, result);
        if (!result) {
          job.output.write(
            new ArticleLineNode({
              children: ["没有文件"].map((text) => new ArticleTextNode({ text })),
            })
          );
          count += 1;
          return;
        }
        for (let i = 0; i < result.length; i += 1) {
          await (async () => {
            const file = result[i];
            //     console.log(3, file.name);
            job.output.write(
              new ArticleLineNode({
                children: ["处理文件", file.name].map((text) => new ArticleTextNode({ text })),
              })
            );
            const next_name = file.name.replace(new RegExp(regexp), replace);
            job.output.write(
              new ArticleLineNode({
                children: ["新文件名是", next_name].map((text) => new ArticleTextNode({ text })),
              })
            );
            if (file.name === next_name) {
              return;
            }
            const r = await drive.client.rename_file(file.id, next_name);
            if (r.error) {
              job.output.write(
                new ArticleLineNode({
                  children: ["重命名失败，因为 ", r.error.message].map((text) => new ArticleTextNode({ text })),
                })
              );
              return;
            }
            await store.prisma.file.updateMany({
              where: {
                file_id: file.id,
              },
              data: {
                updated: dayjs().toISOString(),
                name: next_name,
              },
            });
            await store.prisma.parsed_episode.updateMany({
              where: {
                file_id: file.id,
              },
              data: {
                updated: dayjs().toISOString(),
                name: next_name,
              },
            });
            await store.prisma.parsed_movie.updateMany({
              where: {
                file_id: file.id,
              },
              data: {
                updated: dayjs().toISOString(),
                name: next_name,
              },
            });
            await store.prisma.bind_for_parsed_tv.updateMany({
              where: {
                file_id_link_resource: file.id,
              },
              data: {
                updated: dayjs().toISOString(),
                file_name_link_resource: next_name,
              },
            });
          })();
        }
      })();
    } while (folder.next_marker);
    //     console.log(4);
    job.finish();
  }
  run({
    file_id: folder_id,
    regexp,
    replace,
  });
  res.status(200).json({ code: 0, msg: "重命名成功", data: { job_id: job.id } });
}
