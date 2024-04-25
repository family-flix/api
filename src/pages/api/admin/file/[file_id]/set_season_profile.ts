/**
 * @file 指定文件夹是什么电视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { app, store } from "@/store";
import { User } from "@/domains/user";
import { Job, TaskTypes } from "@/domains/job";
import { FileRecord, ParsedTVRecord } from "@/domains/store/types";
import { MediaSearcher } from "@/domains/searcher";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { Folder } from "@/domains/folder";
import { Drive } from "@/domains/drive";
import { FileType } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id, drive_id } = req.body as Partial<{ file_id: string; drive_id: string }>;
  const { type, unique_id } = req.body as Partial<{ type: number; unique_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!file_id) {
    return e(Result.Err("缺少文件 file_id"));
  }
  if (!unique_id) {
    return e(Result.Err("缺少电视剧详情 id"));
  }
  const file = await store.prisma.file.findFirst({
    where: {
      file_id,
      user_id: user.id,
    },
  });
  if (!file) {
    return e(Result.Err("没有匹配的记录"));
  }
  if (file.type !== FileType.Folder) {
    return e(Result.Err("只有文件夹可以关联电视剧"));
  }
  const job_res = await Job.New({
    unique_id: "update_movie_and_season",
    desc: `文件夹[${file.name}]设置电视剧详情`,
    type: TaskTypes.RefreshMedia,
    user_id: user.id,
    app,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  const drive_res = await Drive.Get({ id: file.drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const searcher_res = await MediaSearcher.New({
    user,
    store,
    assets: app.assets,
    on_print(v) {
      job.output.write(v);
    },
  });
  if (searcher_res.error) {
    return e(searcher_res);
  }
  const searcher = searcher_res.data;
  async function run(file: FileRecord) {
    const profile_res = await searcher.get_tv_profile_with_tmdb_id({ tmdb_id: Number(unique_id) });
    if (profile_res.error) {
      job.output.write_line(["获取详情失败", profile_res.error.message]);
      job.finish();
      return;
    }
    job.output.write_line(["获取详情记录成功"]);
    const profile = profile_res.data;
    const parsed_tv_res = await (async () => {
      const existing = await store.prisma.parsed_tv.findFirst({
        where: {
          file_name: file.name,
          user_id: user.id,
        },
      });
      if (existing) {
        job.output.write_line(["该文件夹有电视剧解析结果"]);
        await store.prisma.parsed_tv.update({
          where: {
            id: existing.id,
          },
          data: {
            tv_id: null,
            unique_id: String(unique_id),
          },
        });
        return Result.Ok(existing);
      }
      job.output.write_line(["创建解析结果"]);
      const created = await store.add_parsed_tv({
        file_name: file.name,
        unique_id: String(unique_id),
        user_id: user.id,
        drive_id: drive.id,
      });
      return created;
    })();
    if (parsed_tv_res.error) {
      job.output.write_line(["获取电视解析结果失败", parsed_tv_res.error.message]);
      job.finish();
      return;
    }
    const parsed_tv = parsed_tv_res.data;
    const folder = new Folder(file.file_id, {
      client: drive.client,
    });
    job.output.write_line(["获取文件夹详情"]);
    const r = await folder.profile();
    if (r.error) {
      job.output.write_line(["获取文件详情失败"]);
      job.finish();
      return;
    }
    job.output.write_line(["开始遍历该文件夹"]);
    do {
      await (async () => {
        const files_res = await folder.next();
        if (files_res.error) {
          return;
        }
        const files = files_res.data;
        for (let i = 0; i < files.length; i += 1) {
          const file = files[i];
          job.output.write_line([file.name]);
          if (file.type === "file") {
            await store.prisma.parsed_episode.updateMany({
              where: {
                file_id: file.id,
                user_id: user.id,
              },
              data: {
                updated: dayjs().toISOString(),
                parsed_tv_id: parsed_tv.id,
                episode_id: null,
                season_id: null,
                can_search: 1,
              },
            });
          }
        }
      })();
    } while (folder.next_marker);
    job.output.write_line(["结束遍历，开始为解析结果匹配详情信息"]);
    const names = [profile.name, profile.original_name].filter(Boolean) as string[];
    const r2 = await searcher.run(
      names.map((n) => {
        return { name: n };
      })
    );
    if (r2.error) {
      job.output.write_line(["解析失败，因为", r2.error.message]);
      job.finish();
      return;
    }
    job.finish();
  }
  run(file);
  res.status(200).json({ code: 0, msg: "变更电视剧详情", data: { job_id: job.id } });
}
