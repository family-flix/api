import { Application } from "@/domains/application";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { DatabaseStore } from "@/domains/store";
import { ModelQuery } from "@/domains/store/types";
import { User } from "@/domains/user";
import { DriveTypes } from "@/domains/drive/constants";
import { Drive } from "@/domains/drive";
import { Job, TaskTypes } from "@/domains/job";
import { DriveAnalysis } from "@/domains/analysis";
import { ResourceSyncTask } from "@/domains/resource_sync_task";
import { MediaSearcher } from "@/domains/searcher";
import { ProfileRefresh } from "@/domains/profile_refresh";
import { Result } from "@/types";
import { FileType } from "@/constants";

export class ScheduleTask {
  store: DatabaseStore;
  app: Application;

  constructor(props: { app: Application; store: DatabaseStore }) {
    const { app, store } = props;
    this.app = app;
    this.store = store;
  }
  /** 云盘签到 */
  async check_in() {
    const results: {
      name: string;
      text: string[];
    }[] = [];
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.user.findMany({
          where: {},
          ...extra,
        });
      },
      handler: async (d) => {
        const t_res = await User.Get({ id: d.id }, this.store);
        if (t_res.error) {
          return;
        }
        const user = t_res.data;
        await walk_model_with_cursor({
          fn: (extra) => {
            return this.store.prisma.drive.findMany({
              where: {
                type: DriveTypes.AliyunBackupDrive,
                user_id: user.id,
              },
              ...extra,
            });
          },
          handler: async (data) => {
            const drive_res = await Drive.Get({ id: data.id, user, store: this.store });
            if (drive_res.error) {
              results.push({
                name: data.id,
                text: ["签到失败", drive_res.error.message],
              });
              return;
            }
            const drive = drive_res.data;
            const r = await drive.client.checked_in();
            if (r.error) {
              results.push({
                name: drive.name,
                text: ["签到失败", r.error.message],
              });
              return;
            }
            results.push({
              name: drive.name,
              text: ["签到成功"],
            });
          },
        });
      },
    });
    return results;
  }
  /** 执行所有用户的同步任务 */
  async run_sync_task_list() {
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.user.findMany({
          where: {},
          ...extra,
        });
      },
      handler: async (d) => {
        const t_res = await User.Get({ id: d.id }, this.store);
        if (t_res.error) {
          return;
        }
        const user = t_res.data;
        await this.run_sync_tasks_of_user(user);
      },
    });
  }
  /** 执行指定用户所有的同步任务 */
  async run_sync_tasks_of_user(user: User) {
    const results: {
      name: string;
      text: string[];
    }[] = [];
    const job_res = await Job.New({
      unique_id: "sync_all_tv",
      desc: "[定时任务]同步资源文件夹新增影片",
      type: TaskTypes.FilesSync,
      user_id: user.id,
      store: this.store,
    });
    if (job_res.error) {
      return Result.Err(job_res.error.message);
    }
    const job = job_res.data;
    const where: ModelQuery<"bind_for_parsed_tv"> = {
      season_id: { not: null },
      in_production: 1,
      invalid: 0,
      user_id: user.id,
    };
    const count = await this.store.prisma.bind_for_parsed_tv.count({ where });
    job.output.write_line(["共", count, "个同步任务"]);
    await walk_model_with_cursor({
      fn: () => {
        return this.store.prisma.bind_for_parsed_tv.findMany({
          where,
        });
      },
      handler: async (data, index) => {
        const { id, name } = data;
        job.output.write_line(["第", index + 1, "个"]);
        const task_res = await ResourceSyncTask.Get({
          id,
          user,
          store: this.store,
          assets: this.app.assets,
        });
        if (task_res.error) {
          job.output.write_line(["初始化同步任务失败，因为", task_res.error.message]);
          return;
        }
        const task = task_res.data;
        task.on_print((v) => {
          job.output.write(v);
        });
        job.output.write_line([`开始更新「${name}」`]);
        await task.run();
      },
    });
    job.output.write_line(["同步任务执行完毕，开始索引新增影片"]);
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.drive.findMany({
          where: {
            user_id: user.id,
          },
          ...extra,
        });
      },
      handler: async (data, index) => {
        const { id } = data;
        const drive_res = await Drive.Get({ id, user, store: this.store });
        if (drive_res.error) {
          return;
        }
        const drive = drive_res.data;
        const tmp_folders = await this.store.prisma.tmp_file.findMany({
          where: {
            drive_id: drive.id,
            user_id: user.id,
          },
        });
        if (tmp_folders.length === 0) {
          job.output.write_line(["云盘", `「${drive.name}」`, "没有新增视频文件，跳过"]);
          return;
        }
        job.output.write_line(["云盘", `「${drive.name}」`, "有新增视频文件", tmp_folders.length, "个"]);
        const r2 = await DriveAnalysis.New({
          drive,
          store: this.store,
          user,
          assets: this.app.assets,
          extra_scope: tmp_folders
            .map((tv) => {
              return tv.name;
            })
            .filter(Boolean) as string[],
          on_print(v) {
            job.output.write(v);
          },
          on_error(error) {
            job.throw(error);
          },
        });
        if (r2.error) {
          job.output.write_line(["初始化云盘索引失败，因为", r2.error.message]);
          return;
        }
        const analysis = r2.data;
        await analysis.run(
          tmp_folders.map((file) => {
            const { name, parent_paths, type } = file;
            return {
              name: [parent_paths, name].filter(Boolean).join("/"),
              type: type === FileType.File ? "file" : "folder",
            };
          })
        );
        job.output.write_line(["云盘", `「${drive.name}」`, "索引完毕"]);
      },
    });
    job.output.write_line(["所有索引完成"]);
    job.finish();
    return results;
  }
  /** 快速索引指定用户的指定云盘 */
  async analysis_drive_quickly(values: { drive_id: string; user: User }) {
    const { drive_id, user } = values;
    const drive_res = await Drive.Get({ id: drive_id, user, store: this.store });
    if (drive_res.error) {
      return Result.Err(drive_res.error.message);
    }
    const drive = drive_res.data;
    if (!drive.has_root_folder()) {
      return Result.Err("请先设置索引目录", 30001);
    }
    const job_res = await Job.New({
      desc: `[定时任务]快速索引云盘「${drive.name}」`,
      type: TaskTypes.DriveAnalysis,
      unique_id: drive.id,
      user_id: user.id,
      store: this.store,
    });
    if (job_res.error) {
      return Result.Err(job_res.error.message);
    }
    const job = job_res.data;
    const tmp_folders = await this.store.prisma.tmp_file.findMany({
      where: {
        drive_id,
        user_id: user.id,
      },
    });
    if (tmp_folders.length === 0) {
      return Result.Err("没有找到可索引的转存文件");
    }
    const r2 = await DriveAnalysis.New({
      drive,
      user,
      assets: this.app.assets,
      store: this.store,
      on_print(v) {
        job.output.write(v);
      },
    });
    if (r2.error) {
      job.output.write_line(["索引失败", r2.error.message]);
      job.finish();
      return Result.Err(r2.error.message);
    }
    const analysis = r2.data;
    // console.log("[API]admin/drive/analysis_quickly/[id].ts - before await analysis.run", tmp_folders.length);
    await analysis.run(
      tmp_folders.map((file) => {
        const { name, parent_paths, type } = file;
        return {
          name: [parent_paths, name].filter(Boolean).join("/"),
          type: type === FileType.File ? "file" : "folder",
        };
      })
    );
    job.output.write_line(["索引完成"]);
    job.finish();
  }
  async refresh_media_profile_list() {
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.user.findMany({
          where: {},
          ...extra,
        });
      },
      handler: async (d) => {
        const t_res = await User.Get({ id: d.id }, this.store);
        if (t_res.error) {
          return;
        }
        const user = t_res.data;
        await this.refresh_media_profile_list_of_user({ user });
      },
    });
  }
  /** 刷新发布时间在近3月的所有电影详情 */
  async refresh_media_profile_list_of_user(values: { user: User }) {
    const { user } = values;
    const job_res = await Job.New({
      desc: "更新电视剧、电影信息",
      unique_id: "update_movie_and_season",
      type: TaskTypes.RefreshMedia,
      user_id: user.id,
      store: this.store,
    });
    if (job_res.error) {
      return Result.Err(job_res.error.message);
    }
    const job = job_res.data;
    const searcher_res = await MediaSearcher.New({
      user,
      store: this.store,
      assets: this.app.assets,
    });
    if (searcher_res.error) {
      return Result.Err(searcher_res.error.message);
    }
    const searcher = searcher_res.data;
    const refresher = new ProfileRefresh({
      searcher,
      store: this.store,
      user,
      on_print(node) {
        job.output.write(node);
      },
    });
    await refresher.refresh_season_list();
    job.output.write_line(["全部电视剧详情刷新完成"]);
    await refresher.refresh_movie_list();
    job.output.write_line(["全部电影详情刷新完成"]);
    job.finish();
    return Result.Ok(null);
  }
  async fetch_expired_sync_task_list() {
    const where: ModelQuery<"bind_for_parsed_tv"> = {
      invalid: 1,
      season_id: {
        not: null,
      },
    };
    const count = await this.store.prisma.bind_for_parsed_tv.count({ where });
    const tasks = await this.store.prisma.bind_for_parsed_tv.findMany({
      where,
      include: {
        season: {
          include: {
            profile: true,
          },
        },
      },
      take: 10,
    });
    const list = tasks.slice(0, 10).map((task) => {
      const { id, season, name } = task;
      return {
        id,
        name: season ? season.profile.name : name,
      };
    });
    return {
      list,
      no_more: count <= 10,
    };
  }
  async validate_drive_list() {
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.user.findMany({
          where: {},
          ...extra,
        });
      },
      handler: async (d, index) => {
        const t_res = await User.Get({ id: d.id }, this.store);
        if (t_res.error) {
          return;
        }
        const user = t_res.data;
        await walk_model_with_cursor({
          fn: (extra) => {
            return this.store.prisma.drive.findMany({
              where: {
                type: DriveTypes.AliyunBackupDrive,
                user_id: user.id,
              },
              ...extra,
            });
          },
          handler: async (data, index) => {
            const { id } = data;
            const drive_res = await Drive.Get({ id, user, store: this.store });
            if (drive_res.error) {
              return;
            }
            const drive = drive_res.data;
            await this.validate_drive(drive);
          },
        });
      },
    });
    return Result.Ok(null);
  }

  async validate_drive(drive: Drive) {
    const client = drive.client;
    const r = await client.refresh_profile();
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const r2 = await this.store.find_parsed_episode({
      drive_id: drive.id,
    });
    if (r2.error) {
      return Result.Err(r2.error.message);
    }
    if (!r2.data) {
      // 没有解析出影片
      return Result.Ok(null);
    }
    const r3 = await client.fetch_video_preview_info(r2.data.file_id);
    if (r3.error) {
      return Result.Err(`[ping]${drive.name} 获取影片 ${r2.data.file_name} 失败，因为 ${r3.error.message}`);
    }
    if (r3.data.sources.length === 0) {
      return Result.Err(`[ping]${drive.name} 影片 ${r2.data.file_name} 没有播放信息`);
    }
    return Result.Ok(null);
  }

  async walk_drive() {
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.user.findMany({
          where: {},
          ...extra,
        });
      },
      handler: async (d, index) => {
        const t_res = await User.Get({ id: d.id }, this.store);
        if (t_res.error) {
          return;
        }
        const user = t_res.data;
        await walk_model_with_cursor({
          fn: (extra) => {
            return this.store.prisma.drive.findMany({
              where: {
                type: DriveTypes.AliyunBackupDrive,
                user_id: user.id,
              },
              ...extra,
            });
          },
          handler: async (data, index) => {
            const { id } = data;
            const drive_res = await Drive.Get({ id, user, store: this.store });
            if (drive_res.error) {
              return;
            }
            const drive = drive_res.data;
          },
        });
      },
    });
  }
}
