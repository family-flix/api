/**
 * @file 清除所有记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store";
import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { Job, TaskTypes } from "@/domains/job";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { Drive } from "@/domains/drive";
import { Folder } from "@/domains/folder";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const where = {
    user_id: user.id,
  };
  const job_res = await Job.New({
    unique_id: "debug/reset",
    type: TaskTypes.Other,
    desc: "重置应用到初始状态",
    user_id: user.id,
    app,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  async function run() {
    job.output.write_line(["清除解析结果"]);
    await store.prisma.parsed_episode.deleteMany({ where });
    await store.prisma.parsed_season.deleteMany({ where });
    await store.prisma.parsed_tv.deleteMany({ where });
    await store.prisma.parsed_movie.deleteMany({ where });
    job.output.write_line(["清除影视剧"]);
    await store.prisma.tv.deleteMany({ where });
    await store.prisma.season.deleteMany({ where });
    await store.prisma.episode.deleteMany({ where });
    await store.prisma.movie.deleteMany({ where });
    job.output.write_line(["清除影视剧详情"]);
    await store.prisma.tv_profile.deleteMany({});
    await store.prisma.season_profile.deleteMany({});
    await store.prisma.episode_profile.deleteMany({});
    await store.prisma.movie_profile.deleteMany({});
    job.output.write_line(["清除文件及关联记录"]);
    await store.prisma.file.deleteMany({ where });
    await store.prisma.bind_for_parsed_tv.deleteMany({ where });
    await store.prisma.tmp_file.deleteMany({ where });
    await store.prisma.subtitle.deleteMany({ where });
    job.output.write_line(["删除云盘内文件"]);
    walk_model_with_cursor({
      fn(extra) {
        return store.prisma.drive.findMany({
          where: {
            user_id: user.id,
          },
          ...extra,
        });
      },
      async handler(record) {
        const { id } = record;
        const drive_res = await Drive.Get({ id, user, store });
        if (drive_res.error) {
          return;
        }
        const drive = drive_res.data;
        const { root_folder_id, root_folder_name } = drive.profile;
        if (!root_folder_id || !root_folder_name) {
          return;
        }
        const folder = new Folder(root_folder_id, {
          client: drive.client,
        });
        job.output.write_line(["删除云盘内文件"]);
        do {
          const files_res = await folder.next();
          if (files_res.error) {
            return;
          }
          const files = files_res.data;
          for (let i = 0; i < files.length; i += 1) {
            const file = files[i];
            job.output.write_line(["删除", file.name]);
            await drive.client.delete_file(file.id);
          }
        } while (folder.next_marker);
      },
    });
    job.output.write_line(["完成"]);
    job.finish();
  }
  run();
  return res.status(200).json({
    code: 0,
    msg: "开始重置",
    data: {
      job_id: job.id,
    },
  });
}
