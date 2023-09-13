/**
 * @file 管理后台/执行指定电视剧同步任务
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ResourceSyncTask } from "@/domains/resource_sync_task";
import { Job } from "@/domains/job";
import { ArticleLineNode, ArticleTextNode } from "@/domains/article";
import { Drive } from "@/domains/drive";
import { TaskTypes } from "@/domains/job/constants";
import { DriveAnalysis } from "@/domains/analysis";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { FileType } from "@/constants";
import { app, store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id || id === "undefined") {
    return e(Result.Err("缺少电视剧 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id, settings } = user;
  const tv = await store.prisma.tv.findFirst({
    where: {
      id,
      user_id,
    },
    include: {
      profile: true,
      parsed_tvs: {
        include: {
          binds: true,
        },
      },
    },
  });
  if (tv === null) {
    return e("没有匹配的电视剧记录");
  }
  const {
    profile: { name, original_name },
    parsed_tvs,
  } = tv;
  const binds = parsed_tvs
    .map((parsed_tv) => {
      return parsed_tv.binds.map((bind) => {
        const { binds, ...rest } = parsed_tv;
        return {
          ...bind,
          parsed_tv: rest,
        };
      });
    })
    .reduce((total, cur) => {
      return total.concat(cur);
    }, [])
    .filter((bind) => {
      return !bind.invalid;
    })
    .filter(Boolean);
  if (binds.length === 0) {
    return e("电视剧还没有更新任务");
  }
  const job_res = await Job.New({
    desc: `更新电视剧 '${name || original_name}'`,
    unique_id: id,
    type: TaskTypes.TVSync,
    user_id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  async function run() {
    const token = settings.tmdb_token;
    if (!token) {
      console.log("[API]tv/sync/[id].ts - after if(!token)");
      return e(Result.Err("缺少 TMDB_TOKEN"));
    }
    for (let i = 0; i < binds.length; i += 1) {
      const bind = binds[i];
      const { parsed_tv } = bind;
      const { drive_id } = parsed_tv;
      const drive_res = await Drive.Get({ id: drive_id, user, store });
      if (drive_res.error) {
        // console.log("[API]tv/sync/[id].ts - drive_res.error", drive_res.error.message);
        job.finish();
        return;
      }
      const drive = drive_res.data;
      const added_files: {
        name: string;
        parent_paths: string;
        type: FileType;
      }[] = [];
      const resourceSyncTask = new ResourceSyncTask({
        task: {
          ...bind,
          parsed_tv,
        },
        user,
        drive,
        client: drive.client,
        store,
        TMDB_TOKEN: token,
        assets: app.assets,
        wait_complete: true,
        on_file(v) {
          console.log("[API]tv/sync/[id].ts - ResourceSyncTask on_file", v.name);
          if (v.type !== FileType.File) {
            return;
          }
          added_files.push(v);
        },
        on_print(v) {
          job.output.write(v);
        },
        on_finish() {
          job.output.write(
            new ArticleLineNode({
              children: [
                new ArticleTextNode({
                  text: `电视剧 '${name || original_name}' 完成同步，开始索引新增影片`,
                }),
              ],
            })
          );
        },
        on_error(error) {
          console.log("[API]tv/sync/[id].ts - ResourceSyncTask on_error", error.message);
          job.throw(error);
        },
      });
      await resourceSyncTask.run();
      // console.log("[API]tv/sync/[id].ts - after await resourceSyncTask.run()");
      // if (added_files.length === 0) {
      //   job.output.write(
      //     new ArticleLineNode({
      //       children: [
      //         new ArticleTextNode({
      //           text: "本次更新没有新增文件，结束更新",
      //         }),
      //       ],
      //     })
      //   );
      //   job.finish();
      //   return;
      // }
      const r2 = await DriveAnalysis.New({
        drive,
        store,
        user,
        assets: app.assets,
        extra_scope: parsed_tvs
          .map((tv) => {
            return tv.name;
          })
          .filter(Boolean) as string[],
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
        },
        on_error(error) {
          job.throw(error);
        },
      });
      if (r2.error) {
        // console.log("[API]tv/sync/[id].ts - after r2.error", r2.error);
        return e(r2);
      }
      const analysis = r2.data;
      const { root_folder_name } = drive.profile;
      // console.log("[]", tmp_folders);
      // console.log("[API]tv/sync/[id].ts - before await analysis.run", added_files);
      await analysis.run(
        added_files.map((file) => {
          const { name, parent_paths, type } = file;
          return {
            name: [parent_paths, name].filter(Boolean).join("/"),
            type: type === FileType.File ? "file" : "folder",
          };
        })
      );
      // console.log("[API]tv/sync/[id].ts - after await analysis.run");
    }
    // console.log("[API]tv/sync/[id].ts - before job.finish");
    job.finish();
  }
  run();
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      job_id: job.id,
    },
  });
}
