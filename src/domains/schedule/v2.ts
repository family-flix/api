import dayjs from "dayjs";

import { Application } from "@/domains/application";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { DatabaseStore } from "@/domains/store";
import { FileRecord, MediaProfileRecord, ModelQuery } from "@/domains/store/types";
import { User } from "@/domains/user";
import { DriveTypes } from "@/domains/drive/constants";
import { Drive } from "@/domains/drive/v2";
import { Job, TaskTypes } from "@/domains/job";
import { DriveAnalysis } from "@/domains/analysis/v2";
import { ResourceSyncTask } from "@/domains/resource_sync_task/v2";
import { MediaSearcher } from "@/domains/searcher/v2";
import { MediaProfileClient } from "@/domains/media_profile";
import { normalize_partial_tv } from "@/domains/media_thumbnail/utils";
import { Administrator } from "@/domains/administrator";
import { TencentDoc } from "@/domains/tencent_doc";
import { MediaRankClient } from "@/domains/media_rank";
import { DoubanClient } from "@/domains/media_profile/douban";
import { Result } from "@/types";
import {
  CollectionTypes,
  FileType,
  MediaErrorTypes,
  MediaProfileSourceTypes,
  MediaTypes,
  ReportTypes,
  ResourceSyncTaskStatus,
} from "@/constants";
import { bytes_to_size, r_id } from "@/utils";

type TVProfileError = {
  id: string;
  name: string | null;
  poster_path: string | null;
  tv_count: number;
  tvs: {
    id: string;
    name: string | null;
    poster_path: string | null;
    season_count: number;
    episode_count: number;
  }[];
};
type EpisodeProfileError = {
  id: string;
  name: string | null;
  poster_path: string | null;
  season_number: number | null;
  episode_number: number | null;
  episode_count: number;
  episodes: {
    id: string;
    tv_id: string;
    name: string | null;
    poster_path: string | null;
    season_id: string;
    season_text: string;
    episode_text: string;
    source_count: number;
  }[];
};
type SeasonProfileError = {
  id: string;
  name: string | null;
  poster_path: string | null;
  season_number: number | null;
  season_count: number;
  seasons: {
    id: string;
    tv_id: string;
    name: string | null;
    poster_path: string | null;
    episode_count: number;
  }[];
};
type MovieProfileError = {
  id: string;
  name: string | null;
  poster_path: string | null;
  movies: {
    id: string;
    name: string | null;
    poster_path: string | null;
    source_count: number;
  }[];
};
type TVError = {
  id: string;
  name: string | null;
  poster_path: string | null;
  texts: string[];
};
type SeasonError = {
  id: string;
  name: string | null;
  poster_path: string | null;
  tv_id: string;
  season_text: string;
  texts: string[];
};
type EpisodeError = {
  id: string;
  name: string | null;
  poster_path: string | null;
  tv_id: string;
  season_id: string;
  season_text: string;
  episode_text: string;
  texts: string[];
};
type MovieError = {
  id: string;
  name: string | null;
  poster_path: string | null;
  texts: string[];
};

export class ScheduleTask {
  store: DatabaseStore;
  app: Application<any>;

  constructor(props: { app: Application<any>; store: DatabaseStore }) {
    const { app, store } = props;
    this.app = app;
    this.store = store;
  }

  /** 遍历用户 */
  async walk_user(handler: (user: Administrator) => Promise<unknown>) {
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.user.findMany({
          where: {},
          ...extra,
        });
      },
      handler: async (d, index) => {
        const t_res = await Administrator.Get({ id: d.id }, this.store);
        if (t_res.error) {
          return;
        }
        const user = t_res.data;
        await handler(user);
      },
    });
  }
  /** 遍历云盘 */
  async walk_drive(handler: (drive: Drive, user: User) => Promise<unknown>) {
    await this.walk_user(async (user) => {
      await walk_model_with_cursor({
        fn: (extra) => {
          return this.store.prisma.drive.findMany({
            where: {
              // type: DriveTypes.AliyunBackupDrive,
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
          await handler(drive, user);
        },
      });
    });
  }

  /** 云盘签到 */
  async check_in() {
    const results: {
      name: string;
      text: string[];
    }[] = [];
    await this.walk_drive(async (drive) => {
      if (drive.type === DriveTypes.AliyunResourceDrive) {
        return;
      }
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
    });
    return results;
  }
  /** 执行所有用户的同步任务 */
  async run_sync_task_list() {
    await this.walk_user(async (user) => {
      await this.run_sync_tasks_of_user(user);
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
      app: this.app,
      store: this.store,
    });
    if (job_res.error) {
      return Result.Err(job_res.error.message);
    }
    const job = job_res.data;
    const where: ModelQuery<"resource_sync_task"> = {
      status: ResourceSyncTaskStatus.WorkInProgress,
      invalid: 0,
      user_id: user.id,
    };
    const count = await this.store.prisma.resource_sync_task.count({ where });
    job.output.write_line(["共", count, "个同步任务"]);
    const folders_need_analysis: { file_id: string; name: string; drive_id: string; type: FileType }[] = [];
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.resource_sync_task.findMany({
          where,
          ...extra,
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
        job.output.write_line([`开始更新「${name}]`]);
        await task.run();
        if (task.added_file_count) {
          folders_need_analysis.push({
            file_id: task.profile.file_id_link_resource,
            name: task.profile.file_name_link_resource,
            drive_id: task.profile.drive_id,
            type: FileType.Folder,
          });
        }
      },
    });
    job.output.write_line(["同步任务执行完毕，开始索引新增影片"]);
    const drives_with_folder: Record<
      string,
      {
        file_id: string;
        name: string;
        drive_id: string;
        type: FileType;
      }[]
    > = {};
    for (let i = 0; i < folders_need_analysis.length; i += 1) {
      const folder = folders_need_analysis[i];
      drives_with_folder[folder.drive_id] = drives_with_folder[folder.drive_id] || [];
      drives_with_folder[folder.drive_id].push(folder);
    }
    const drive_ids = Object.keys(drives_with_folder);
    for (let i = 0; i < drive_ids.length; i += 1) {
      const id = drive_ids[i];
      const drive_res = await Drive.Get({ id, user, store: this.store });
      if (drive_res.error) {
        job.output.write_line(["初始化云盘失败，因为 ", drive_res.error.message]);
        return;
      }
      const drive = drive_res.data;
      const resource_folders = drives_with_folder[id];
      const r2 = await DriveAnalysis.New({
        drive,
        store: this.store,
        user,
        assets: this.app.assets,
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
      await analysis.run2(
        resource_folders
          .filter((f) => {
            return f.file_id;
          })
          .map((file) => {
            const { file_id, name, type } = file;
            return {
              file_id: file_id as string,
              name,
              type,
            };
          })
      );
      job.output.write_line(["云盘", `[${drive.name}]`, "索引完毕"]);
    }
    job.output.write_line(["所有索引完成"]);
    job.finish();
    return results;
  }
  /** 仅索引指定用户的指定云盘内新增的文件 */
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
      desc: `[定时任务]快速索引云盘「${drive.name}]`,
      type: TaskTypes.DriveAnalysis,
      unique_id: drive.id,
      user_id: user.id,
      app: this.app,
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
    await analysis.run();
    job.output.write_line(["索引完成"]);
    job.finish();
  }
  async refresh_media_profile_list() {
    await this.walk_user(async (user) => {
      const r = await this.refresh_media_profile_list_of_user({ user });
      if (r.error) {
        console.log(r.error.message);
        return;
      }
    });
  }
  async refresh_media_profile_list_of_user(values: { user: User }) {
    const { user } = values;
    const job_res = await Job.New({
      desc: "[定时任务]更新电视剧、电影信息",
      unique_id: "update_movie_and_season",
      type: TaskTypes.RefreshMedia,
      user_id: user.id,
      app: this.app,
      store: this.store,
    });
    if (job_res.error) {
      return Result.Err(job_res.error.message);
    }
    const job = job_res.data;
    const profile_res = await MediaProfileClient.New({
      store: this.store,
      assets: this.app.assets,
      token: user.settings.tmdb_token,
    });
    if (profile_res.error) {
      return Result.Err(profile_res.error.message);
    }
    const profile_client = profile_res.data;
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.media_profile.findMany({
          include: {
            series: true,
          },
          orderBy: {
            created: "desc",
          },
          ...extra,
        });
      },
      handler: async (data) => {
        // console.log(data);
        console.log(data.name);
        const r = await profile_client.refresh_media_profile_with_tmdb(data);
        if (r.error) {
          console.log(r.error.message);
        }
        const r2 = await profile_client.refresh_profile_with_douban(data);
        if (r2.error) {
          console.log(r2.error.message);
        }
      },
    });
    job.output.write_line(["全部影视剧详情刷新完成"]);
    job.finish();
    return Result.Ok(null);
  }
  async fetch_expired_sync_task_list() {
    const where: ModelQuery<"resource_sync_task"> = {
      invalid: 1,
      media_id: {
        not: null,
      },
    };
    const count = await this.store.prisma.resource_sync_task.count({ where });
    const tasks = await this.store.prisma.resource_sync_task.findMany({
      where,
      include: {
        media: {
          include: {
            profile: true,
          },
        },
      },
      take: 10,
    });
    const list = tasks.slice(0, 10).map((task) => {
      const { id, media, name } = task;
      return {
        id,
        name: media ? media.profile.name : name,
      };
    });
    return {
      list,
      no_more: count <= 10,
    };
  }
  async validate_drive_list() {
    await this.walk_drive(async (drive) => {
      if (drive.type === DriveTypes.AliyunResourceDrive) {
        return;
      }
      await this.validate_drive(drive);
    });
    return Result.Ok(null);
  }
  /** 校验云盘有效性 */
  async validate_drive(drive: Drive) {
    const client = drive.client;
    const r = await client.refresh_profile();
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const r2 = await this.store.prisma.parsed_media_source.findFirst({
      where: {
        drive_id: drive.id,
      },
    });
    if (!r2) {
      // 没有解析出影片
      return Result.Ok(null);
    }
    const r3 = await client.fetch_video_preview_info(r2.file_id);
    if (r3.error) {
      return Result.Err(`[ping]${drive.name} 获取影片 ${r2.file_name} 失败，因为 ${r3.error.message}`);
    }
    if (r3.data.sources.length === 0) {
      return Result.Err(`[ping]${drive.name} 影片 ${r2.file_name} 没有播放信息`);
    }
    return Result.Ok(null);
  }
  async update_daily_updated() {
    await this.walk_user(async (user) => {
      await this.update_user_daily_updated(user);
    });
  }
  /**
   * 更新用户每日新增影视剧草稿
   */
  async update_user_daily_updated(user: User) {
    const store = this.store;
    const dailyUpdateCollection = await (async () => {
      const r = await store.prisma.collection_v2.findFirst({
        where: {
          type: CollectionTypes.DailyUpdateDraft,
          user_id: user.id,
        },
      });
      if (!r) {
        return store.prisma.collection_v2.create({
          data: {
            id: r_id(),
            title: dayjs().unix().toString(),
            type: CollectionTypes.DailyUpdateDraft,
            user_id: user.id,
          },
        });
      }
      return r;
    })();
    const range = [dayjs().startOf("day").toISOString(), dayjs().endOf("day").toISOString()];
    const season_media_sources = await store.prisma.media_source.findMany({
      where: {
        type: MediaTypes.Season,
        created: {
          gte: range[0],
          lt: range[1],
        },
        user_id: user.id,
      },
      include: {
        media: {
          include: {
            profile: true,
          },
        },
      },
      distinct: ["media_id"],
      take: 20,
      orderBy: [
        {
          created: "desc",
        },
      ],
    });
    type SeasonMediaPayload = {
      id: string;
      type: MediaTypes;
      // name: string;
      // poster_path: string;
      // air_date: string;
      // tv_id?: string;
      // season_text?: string;
      // text: string | null;
      created: Date;
    };
    const season_medias: SeasonMediaPayload[] = [];
    for (let i = 0; i < season_media_sources.length; i += 1) {
      await (async () => {
        const episode = season_media_sources[i];
        const { media: season } = episode;
        const latest_episode = await store.prisma.media_source.findFirst({
          where: {
            media_id: season.id,
            files: {
              some: {},
            },
          },
          include: {
            profile: true,
          },
          orderBy: {
            profile: {
              order: "desc",
            },
          },
          take: 1,
        });
        if (!latest_episode) {
          return;
        }
        const media = {
          id: season.id,
          type: MediaTypes.Season,
          // name: season.profile.name,
          // poster_path: season.profile.poster_path,
          // air_date: dayjs(season.profile.air_date).format("YYYY/MM/DD"),
          // text: await (async () => {
          //   const episode_count = await store.prisma.episode.count({
          //     where: {
          //       season_id: season.id,
          //       parsed_episodes: {
          //         some: {},
          //       },
          //     },
          //   });
          //   if (season.profile.source_count === episode_count) {
          //     return `全${season.profile.source_count}集`;
          //   }
          //   if (episode_count === latest_episode.profile.order) {
          //     return `更新至${latest_episode.profile.order}集`;
          //   }
          //   return `收录${episode_count}集`;
          // })(),
          // created: dayjs(latest_episode.created).unix(),
          created: latest_episode.created,
        } as SeasonMediaPayload;
        season_medias.push(media);
      })();
    }
    const movie_medias = await store.prisma.media.findMany({
      where: {
        type: MediaTypes.Movie,
        media_sources: {
          some: {
            files: {
              some: {},
            },
          },
        },
        created: {
          gte: range[0],
          lt: range[1],
        },
        user_id: user.id,
      },
      include: {
        profile: true,
      },
      distinct: ["id"],
      take: 20,
      orderBy: [
        {
          created: "desc",
        },
      ],
    });
    const medias = [...season_medias, ...movie_medias];
    const orders = medias
      .sort((a, b) => {
        return b.created.valueOf() - a.created.valueOf();
      })
      .map((media, index) => {
        return {
          [media.id]: index,
        };
      })
      .reduce((result, cur) => {
        return {
          ...result,
          ...cur,
        };
      }, {});
    await store.prisma.collection_v2.update({
      where: {
        id: dailyUpdateCollection.id,
      },
      data: {
        title: dayjs().unix().toString(),
        extra: (() => {
          if (!orders) {
            return "{}";
          }
          return JSON.stringify({
            orders,
          });
        })(),
        medias: {
          set: medias.map((media) => {
            return { id: media.id };
          }),
        },
      },
    });
  }
  /** 更新重复的影视剧详情记录 */
  async find_duplicated_medias() {}
  async find_media_and_media_source_errors() {
    await this.walk_user(async (user) => {
      await this.find_media_errors({ user });
      // await this.find_media_source_errors({ user });
      // await this.find_movie_errors({ user });
    });
  }
  async find_media_errors(options: { user: User }) {
    const { user } = options;
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.media.findMany({
          where: {
            profile: {
              order: {
                not: 0,
              },
            },
            user_id: user.id,
          },
          include: {
            _count: true,
            profile: true,
            resource_sync_tasks: {
              where: {
                invalid: 0,
                status: ResourceSyncTaskStatus.WorkInProgress,
              },
              take: 10,
            },
          },
          orderBy: {
            profile: { air_date: "desc" },
          },
          ...extra,
        });
      },
      handler: async (media, index) => {
        const { id, type, resource_sync_tasks, _count } = media;
        const profile = media.profile;
        const tips: string[] = [];
        console.log(profile.name);
        if (_count.media_sources === 0) {
          tips.push("关联的剧集数为 0");
        }
        if (_count.media_sources !== profile.source_count) {
          if (resource_sync_tasks.length === 0) {
            tips.push("集数不全且没有同步任务");
          }
          if (!profile.in_production) {
            tips.push(`已完结但集数不全，总集数 ${profile.source_count}，当前集数 ${_count.media_sources}`);
          }
        }
        const invalid_media_sources = await this.store.prisma.media_source.findMany({
          where: {
            media_id: id,
            files: {
              none: {},
            },
          },
        });
        if (invalid_media_sources.length !== 0) {
          if (type === MediaTypes.Movie) {
            tips.push("没有可播放的视频源");
          }
          if (type === MediaTypes.Season) {
            tips.push(`存在${invalid_media_sources.length}个没有视频源的剧集`);
          }
        }
        console.log(tips);
        if (tips.length === 0) {
          return;
        }
        const payload = { tips };
        const existing = await this.store.prisma.invalid_media.findFirst({
          where: {
            media_id: media.id,
            user_id: user.id,
          },
        });
        const error_type = (() => {
          if (type === MediaTypes.Season) {
            return MediaErrorTypes.Season;
          }
          if (type === MediaTypes.Movie) {
            return MediaErrorTypes.Movie;
          }
          return MediaErrorTypes.Unknown;
        })();
        if (existing) {
          await this.store.prisma.invalid_media.update({
            where: {
              id: existing.id,
            },
            data: {
              type: error_type,
              profile: JSON.stringify(payload),
              updated: dayjs().toISOString(),
            },
          });
          return;
        }
        await this.store.prisma.invalid_media.create({
          data: {
            id: r_id(),
            media_id: media.id,
            type: error_type,
            profile: JSON.stringify(payload),
            user_id: user.id,
          },
        });
      },
    });
  }
  async find_media_source_errors(options: { user: User }) {
    const { user } = options;
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.media_source.findMany({
          where: {
            user_id: user.id,
          },
          include: {
            _count: true,
            profile: true,
          },
          orderBy: {
            profile: { air_date: "desc" },
          },
          ...extra,
        });
      },
      handler: async (data, index) => {
        const episode = data;
        const { id, profile, _count } = episode;
        const tips: string[] = [];
        if (_count.files === 0) {
          tips.push("视频源数量为 0");
        }
        if (tips.length === 0) {
          return;
        }
        const payload = {
          tips,
        };
        const existing = await this.store.prisma.invalid_media_source.findFirst({
          where: {
            media_source_id: episode.id,
            type: MediaErrorTypes.Episode,
            user_id: user.id,
          },
        });
        if (existing) {
          await this.store.prisma.invalid_media_source.update({
            where: {
              id: existing.id,
            },
            data: {
              type: MediaErrorTypes.Episode,
              profile: JSON.stringify(payload),
              updated: dayjs().toISOString(),
            },
          });
          return;
        }
        await this.store.prisma.invalid_media_source.create({
          data: {
            id: r_id(),
            media_source_id: episode.id,
            type: MediaErrorTypes.Episode,
            profile: JSON.stringify(payload),
            user_id: user.id,
          },
        });
      },
    });
  }
  async update_stats() {
    const store = this.store;
    console.log("[SCHEDULE]begin update_stats");
    await this.walk_user(async (user) => {
      await this.update_stats_of_user(user);
    });
    console.log("[SCHEDULE]finish update_stats");
  }
  async update_stats_of_user(user: Administrator) {
    user.refresh_stats();
  }
  /** 更新同步资源链接 */
  async update_sync_task_resources(url: string) {
    const doc = new TencentDoc({
      url,
    });
    const r = await doc.fetch();
    if (r.error) {
      console.log("fetch doc profile failed, because", r.error.message);
      return;
    }
    const resources = r.data;
    await this.walk_user(async (user) => {
      await walk_model_with_cursor({
        fn: (extra) => {
          return this.store.prisma.bind_for_parsed_tv.findMany({
            where: {
              season_id: { not: null },
              invalid: 1,
              user_id: user.id,
            },
            include: {
              season: {
                include: {
                  tv: {
                    include: {
                      profile: true,
                    },
                  },
                },
              },
            },
            ...extra,
          });
        },
        handler: async (data, index) => {
          const { season } = data;
          if (!season) {
            return;
          }
          const { name } = season.tv.profile;
          console.log(name);
          const matched_resource = resources.find((e) => e.name === name);
          if (!matched_resource) {
            console.log("the resource is expired but there no valid resource, ", name);
            return;
          }
          const r = await ResourceSyncTask.Get({
            id: data.id,
            ignore_invalid: true,
            assets: this.app.assets,
            user,
            store: this.store,
          });
          if (r.error) {
            console.log("fetch sync task failed, because", r.error.message);
            return;
          }
          const task = r.data;
          const r2 = await task.override({ url: matched_resource.link });
          if (r2.error) {
            console.log("override resource failed, because", r2.error.message);
            return;
          }
          console.log(name, "override resource success");
        },
      });
    });
  }
  /**
   * 将每日更新草稿归档 start
   */
  async archive_daily_update_collection() {
    const store = this.store;
    const list = await store.prisma.collection.findMany({
      where: {
        type: CollectionTypes.DailyUpdateDraft,
      },
      include: {
        seasons: true,
        movies: true,
      },
      orderBy: [
        {
          sort: "desc",
        },
        {
          created: "desc",
        },
      ],
      skip: 0,
      take: 10,
    });
    for (let i = 0; i < list.length; i += 1) {
      await (async () => {
        const draft = list[i];
        const t = dayjs().format("YYYY-MM-DD");
        const e = await store.prisma.collection.findFirst({
          where: {
            title: t,
            user_id: draft.user_id,
          },
        });
        if (e) {
          await store.prisma.collection.update({
            where: {
              id: e.id,
            },
            data: {
              medias: draft.medias,
              seasons: {
                set: draft.seasons.map((season) => {
                  return {
                    id: season.id,
                  };
                }),
              },
              movies: {
                set: draft.movies.map((movie) => {
                  return {
                    id: movie.id,
                  };
                }),
              },
            },
          });
          return;
        }
        await store.prisma.collection.create({
          data: {
            id: r_id(),
            title: t,
            type: CollectionTypes.DailyUpdateArchive,
            medias: draft.medias,
            seasons: {
              connect: draft.seasons.map((season) => {
                return {
                  id: season.id,
                };
              }),
            },
            movies: {
              connect: draft.movies.map((movie) => {
                return {
                  id: movie.id,
                };
              }),
            },
            user_id: draft.user_id,
          },
        });
      })();
    }
  }
  async update_media_profile(values: { tmdb_token?: string }) {
    const store = this.store;
    const client_res = await MediaProfileClient.New({
      token: values.tmdb_token,
      assets: this.app.assets,
      store,
    });
    if (client_res.error) {
      console.log(client_res.error.message);
      return Result.Err(client_res.error.message);
    }
    const client = client_res.data;
    await walk_model_with_cursor({
      fn(extra) {
        return store.prisma.media_profile.findMany({
          where: {
            // douban_id: null,
            order: {
              not: 0,
            },
          },
          include: {
            series: true,
          },
          ...extra,
        });
      },
      async handler(data, index) {
        const { id, type, name, order, air_date, series } = data;
        console.log(`${index + 1}、`, name);
        await Promise.all([
          (async () => {
            const r1 = await client.refresh_media_profile_with_tmdb(data);
            if (r1.error) {
              console.log(r1.error.message);
              return;
            }
          })(),
          (async () => {
            const r1 = await client.refresh_profile_with_douban(data);
            if (r1.error) {
              console.log(r1.error.message);
              return;
            }
          })(),
        ]);
      },
    });
    return Result.Ok({});
  }
  /** 清理不存在云盘，但没有删除的文件记录 */
  async clear_expired_parsed_source() {
    const store = this.store;
    await this.walk_drive(async (drive, user) => {
      const where: ModelQuery<"file"> = {
        drive_id: drive.id,
        user_id: user.id,
      };
      const count = await store.prisma.file.count({ where });
      console.log(["共", String(count), "条记录"].join(""));
      await walk_model_with_cursor({
        fn(extra) {
          return store.prisma.parsed_media_source.findMany({
            where,
            ...extra,
          });
        },
        async handler(file, index) {
          const prefix = `[${file.name}]`;
          const res = await drive.client.fetch_file(file.file_id);
          if (res.error) {
            if (res.error.message.includes("file not exist")) {
              console.log([prefix, "删除云盘文件", file.name]);
              console.log([file.id]);
              console.log([file.file_id]);
              console.log([""]);
              await store.prisma.parsed_media_source.delete({
                where: {
                  id: file.id,
                },
              });
              await store.prisma.file.deleteMany({
                where: {
                  file_id: file.file_id,
                },
              });
            }
            return;
          }
        },
      });
      return true;
    });
    console.log("finish update_media_profile");
    return Result.Ok(null);
  }
  /**
   * 列出指定时间内新增的文件
   * 新增文件的大小，和最大的10个文件
   */
  async fetch_added_files_daily(day: string) {
    // import dayjs from "dayjs";
    // import { CollectionTypes, MediaTypes } from "@/constants";
    // import { Application } from "@/domains/application";
    // import { walk_model_with_cursor } from "@/domains/store/utils";
    // import { bytes_to_size, parseJSONStr, r_id } from "@/utils";
    // const day = "2024/02/04";
    const range = (() => {
      if (day) {
        return [dayjs(day).startOf("day").toISOString(), dayjs(day).endOf("day").toISOString()];
      }
      return [dayjs().startOf("day").toISOString(), dayjs().endOf("day").toISOString()];
    })();
    await this.walk_user(async (user) => {
      let size_count = 0;
      await walk_model_with_cursor({
        fn: (extra) => {
          return this.store.prisma.file.findMany({
            where: {
              created: {
                gte: range[0],
                lt: range[1],
              },
              user_id: user.id,
            },
            orderBy: [
              {
                created: "desc",
              },
            ],
            ...extra,
          });
        },
        batch_handler(list, index) {
          size_count += list.reduce((total, f) => {
            return total + f.size || 0;
          }, 0);
        },
      });
      // console.log(bytes_to_size(size_count));
      const files = await this.store.prisma.file.findMany({
        where: {
          created: {
            gte: range[0],
            lt: range[1],
          },
          user_id: user.id,
        },
        include: {
          drive: true,
        },
        orderBy: {
          size: "desc",
        },
        take: 30,
      });
      // 指定日期内新增的占用空间最大的 30 个文件
      const records = files.map((f) => {
        return {
          size: f.size,
          name: f.name,
          filepath: [f.parent_paths, f.name].join("/"),
          drive: {
            id: f.drive.id,
            name: f.drive.name,
          },
        };
      });
      const existing = await this.store.prisma.drive_statistics.findFirst({
        where: {
          date: day,
          user_id: user.id,
        },
      });
      if (existing) {
        await this.store.prisma.drive_statistics.update({
          where: {
            id: existing.id,
          },
          data: {
            data: JSON.stringify({
              size_count,
              files: records,
            }),
          },
        });
        return Result.Ok({
          size_count,
          files: records,
        });
      }
      await this.store.prisma.drive_statistics.create({
        data: {
          id: r_id(),
          date: day,
          data: JSON.stringify({
            size_count,
            files: records,
          }),
          user_id: user.id,
        },
      });
      return Result.Ok({
        size_count,
        files: records,
      });
    });
    console.log("finish fetch_added_files_daily");
    return Result.Ok(null);
  }
  async update_media_rank() {
    const store = this.store;
    const client = MediaRankClient({ store });
    await this.walk_user(async (user) => {
      console.log("更新 豆瓣电视剧排行");
      await (async () => {
        const douban_season = await (async () => {
          const r = await store.prisma.collection_v2.findFirst({
            where: {
              type: CollectionTypes.DoubanSeasonRank,
              user_id: user.id,
            },
          });
          if (!r) {
            return store.prisma.collection_v2.create({
              data: {
                id: r_id(),
                title: "豆瓣热播电视剧",
                type: CollectionTypes.DoubanSeasonRank,
                user_id: user.id,
              },
            });
          }
          return r;
        })();
        const r = await client.fetch_douban_rank({ type: "tv" });
        if (r.error) {
          console.log(r.error.message);
          return;
        }
        await store.prisma.collection_v2.update({
          where: {
            id: douban_season.id,
          },
          data: {
            updated: dayjs().toISOString(),
            desc: `${dayjs().format("HH:mm")} 更新`,
            extra: JSON.stringify({
              list: r.data,
            }),
          },
        });
      })();
      /**  */
      console.log("更新 豆瓣电影排行");
      await (async () => {
        const douban_season = await (async () => {
          const r = await store.prisma.collection_v2.findFirst({
            where: {
              type: CollectionTypes.DoubanMovieRank,
              user_id: user.id,
            },
          });
          if (!r) {
            return store.prisma.collection_v2.create({
              data: {
                id: r_id(),
                title: "豆瓣热门电影",
                type: CollectionTypes.DoubanMovieRank,
                user_id: user.id,
              },
            });
          }
          return r;
        })();
        const r = await client.fetch_douban_rank({ type: "movie" });
        if (r.error) {
          console.log(r.error.message);
          return;
        }
        await store.prisma.collection_v2.update({
          where: {
            id: douban_season.id,
          },
          data: {
            updated: dayjs().toISOString(),
            desc: `${dayjs().format("HH:mm")} 更新`,
            extra: JSON.stringify({
              list: r.data,
            }),
          },
        });
      })();
    });
    console.log("finish update_media_rank");
    return Result.Ok(null);
  }
}
