/**
 * @deprecated
 */
import dayjs from "dayjs";

import { Application } from "@/domains/application";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { DatabaseStore } from "@/domains/store";
import { FileRecord, ModelQuery } from "@/domains/store/types";
import { User } from "@/domains/user";
import { DriveTypes } from "@/domains/drive/constants";
import { Drive } from "@/domains/drive";
import { Job, TaskTypes } from "@/domains/job";
import { DriveAnalysis } from "@/domains/analysis";
import { ResourceSyncTask } from "@/domains/resource_sync_task";
import { MediaSearcher } from "@/domains/searcher";
import { ProfileRefresh } from "@/domains/profile_refresh";
import { normalize_partial_tv } from "@/domains/media_thumbnail/utils";
import { TencentDoc } from "@/domains/tencent_doc";
import { Result } from "@/types";
import {
  CollectionTypes,
  FileType,
  MediaErrorTypes,
  MediaProfileSourceTypes,
  MediaTypes,
  ReportTypes,
} from "@/constants";
import { r_id } from "@/utils";

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
  async walk_user(handler: (user: User) => Promise<unknown>) {
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
    const where: ModelQuery<"bind_for_parsed_tv"> = {
      season_id: { not: null },
      in_production: 1,
      invalid: 0,
      user_id: user.id,
    };
    const count = await this.store.prisma.bind_for_parsed_tv.count({ where });
    job.output.write_line(["共", count, "个同步任务"]);
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.bind_for_parsed_tv.findMany({
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
          job.output.write_line(["云盘", `[${drive.name}]`, "没有新增视频文件，跳过"]);
          return;
        }
        job.output.write_line(["云盘", `[${drive.name}]`, "有新增视频文件", tmp_folders.length, "个"]);
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
        job.output.write_line(["云盘", `[${drive.name}]`, "索引完毕"]);
      },
    });
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
    await this.walk_user(async (user) => {
      await this.refresh_media_profile_list_of_user({ user });
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
    const searcher_res = await MediaSearcher.New({
      user,
      store: this.store,
      assets: this.app.assets,
      on_print(node) {
        job.output.write(node);
      },
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
  async update_daily_updated() {
    await this.walk_user(async (user) => {
      await this.update_user_daily_updated(user);
    });
  }
  async update_user_daily_updated(user: User) {
    const store = this.store;
    const dailyUpdateCollection = await (async () => {
      const r = await store.prisma.collection.findFirst({
        where: {
          type: CollectionTypes.DailyUpdateDraft,
          user_id: user.id,
        },
      });
      if (!r) {
        return store.prisma.collection.create({
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
    const episodes = await store.prisma.episode.findMany({
      where: {
        created: {
          gte: range[0],
          lt: range[1],
        },
        season: {
          profile: {
            source: {
              not: MediaProfileSourceTypes.Other,
            },
          },
        },
        user_id: user.id,
      },
      include: {
        season: {
          include: {
            profile: true,
          },
        },
        tv: {
          include: {
            profile: true,
          },
        },
      },
      distinct: ["season_id"],
      take: 20,
      orderBy: [
        {
          created: "desc",
        },
      ],
    });
    const movies = await store.prisma.movie.findMany({
      where: {
        parsed_movies: {
          some: {},
        },
        user_id: user.id,
        created: {
          gte: range[0],
          lt: range[1],
        },
      },
      include: {
        profile: true,
      },
      orderBy: [
        {
          created: "desc",
        },
      ],
      take: 20,
    });
    type MediaPayload = {
      id: string;
      type: MediaTypes;
      name: string;
      poster_path: string;
      air_date: string;
      tv_id?: string;
      season_text?: string;
      text: string | null;
      created: number;
    };
    const season_medias: MediaPayload[] = [];
    const movie_media: MediaPayload[] = [];
    for (let i = 0; i < episodes.length; i += 1) {
      await (async () => {
        const episode = episodes[i];
        const { tv, season } = episode;
        const latest_episode = await store.prisma.episode.findFirst({
          where: {
            season_id: season.id,
            parsed_episodes: {
              some: {},
            },
          },
          orderBy: {
            episode_number: "desc",
          },
          take: 1,
        });
        if (!latest_episode) {
          return;
        }
        const media = {
          id: season.id,
          type: MediaTypes.Season,
          tv_id: tv.id,
          name: tv.profile.name,
          season_text: season.season_text,
          poster_path: season.profile.poster_path || tv.profile.poster_path,
          air_date: dayjs(season.profile.air_date).format("YYYY/MM/DD"),
          text: await (async () => {
            const episode_count = await store.prisma.episode.count({
              where: {
                season_id: season.id,
                parsed_episodes: {
                  some: {},
                },
              },
            });
            if (season.profile.episode_count === episode_count) {
              return `全${season.profile.episode_count}集`;
            }
            if (episode_count === latest_episode.episode_number) {
              return `更新至${latest_episode.episode_number}集`;
            }
            return `收录${episode_count}集`;
          })(),
          created: dayjs(latest_episode.created).unix(),
        } as MediaPayload;
        season_medias.push(media);
      })();
    }
    for (let i = 0; i < movies.length; i += 1) {
      await (async () => {
        const movie = movies[i];
        const { id, profile, created } = movie;
        const media = {
          id,
          type: MediaTypes.Movie,
          name: profile.name,
          poster_path: profile.poster_path,
          air_date: dayjs(profile.air_date).format("YYYY/MM/DD"),
          text: null,
          created: dayjs(created).unix(),
        } as MediaPayload;
        movie_media.push(media);
      })();
    }
    await store.prisma.collection.update({
      where: {
        id: dailyUpdateCollection.id,
      },
      data: {
        title: dayjs().unix().toString(),
        medias: JSON.stringify(
          [...season_medias, ...movie_media].sort((a, b) => {
            return b.created - a.created;
          })
        ),
        seasons: {
          connect: season_medias.map((season) => {
            return {
              id: season.id,
            };
          }),
        },
        movies: {
          connect: movie_media.map((movie) => {
            return {
              id: movie.id,
            };
          }),
        },
      },
    });
  }
  /** 更新重复的影视剧详情记录 */
  async find_duplicated_medias() {
    await this.walk_user(async (user) => {
      await this.find_duplicated_episode({ user });
      await this.find_duplicated_season({ user });
      await this.find_duplicated_tv({ user });
      await this.find_duplicated_movie({ user });
    });
  }
  /** 获取重复的电影详情 */
  async find_duplicated_movie(options: { user: User }) {
    const { user } = options;
    const store = this.store;
    const duplicate_movie_profiles = await store.prisma.movie_profile.groupBy({
      by: ["unique_id"],
      where: {},
      having: {
        unique_id: {
          _count: {
            gt: 1,
          },
        },
      },
    });
    for (let i = 0; i < duplicate_movie_profiles.length; i += 1) {
      const { unique_id } = duplicate_movie_profiles[i];
      const payload: MovieProfileError[] = [];
      await (async () => {
        const profiles = await store.prisma.movie_profile.findMany({
          where: {
            unique_id,
          },
          include: {
            movies: {
              where: {
                user_id: user.id,
              },
              include: {
                profile: true,
                parsed_movies: true,
              },
            },
          },
          orderBy: {
            unique_id: "asc",
          },
        });
        if (profiles.length === 0) {
          return;
        }
        for (let j = 0; j < profiles.length; j += 1) {
          const { id, name, movies } = profiles[j];
          const profile_payload: MovieProfileError = {
            id,
            name: (() => {
              if (movies.length === 0) {
                return name;
              }
              const movie = movies[0];
              return movie.profile.name || movie.profile.original_name;
            })(),
            poster_path: (() => {
              if (movies.length === 0) {
                return null;
              }
              const movie = movies[0];
              return movie.profile.poster_path;
            })(),
            movies: movies.map((s) => {
              const { id, profile, parsed_movies } = s;
              return {
                id,
                name: profile.name,
                poster_path: profile.poster_path,
                source_count: parsed_movies.length,
              };
            }),
          };
          payload.push(profile_payload);
        }
        const existing = await store.prisma.media_error_need_process.findFirst({
          where: {
            unique_id,
            type: MediaErrorTypes.MovieProfile,
            user_id: user.id,
          },
        });
        if (existing) {
          await store.prisma.media_error_need_process.update({
            where: {
              id: existing.id,
            },
            data: {
              profile: JSON.stringify(payload),
              updated: dayjs().toISOString(),
            },
          });
          return;
        }
        await store.prisma.media_error_need_process.create({
          data: {
            id: r_id(),
            unique_id,
            type: MediaErrorTypes.MovieProfile,
            profile: JSON.stringify(payload),
            user_id: user.id,
          },
        });
      })();
    }
  }
  /** 获取重复的电视剧详情 */
  async find_duplicated_tv(options: { user: User }) {
    const { user } = options;
    const store = this.store;
    const duplicate_tv_profiles = await store.prisma.tv_profile.groupBy({
      by: ["unique_id"],
      where: {},
      having: {
        unique_id: {
          _count: {
            gt: 1,
          },
        },
      },
    });
    for (let i = 0; i < duplicate_tv_profiles.length; i += 1) {
      const { unique_id } = duplicate_tv_profiles[i];
      const payload: TVProfileError[] = [];
      await (async () => {
        const profiles = await store.prisma.tv_profile.findMany({
          where: {
            unique_id,
          },
          include: {
            tvs: {
              where: {
                user_id: user.id,
              },
              include: {
                _count: true,
                profile: true,
                seasons: true,
                episodes: true,
              },
              orderBy: {
                profile: {
                  unique_id: "asc",
                },
              },
            },
          },
        });
        if (profiles.length === 0) {
          return;
        }
        for (let j = 0; j < profiles.length; j += 1) {
          const { id, name, tvs } = profiles[j];
          const profile_payload: TVProfileError = {
            id,
            name: (() => {
              if (tvs.length === 0) {
                return name;
              }
              const tv = tvs[0];
              return tv.profile.name || tv.profile.original_name;
            })(),
            poster_path: (() => {
              if (tvs.length === 0) {
                return null;
              }
              const tv = tvs[0];
              return tv.profile.poster_path;
            })(),
            tv_count: tvs.length,
            tvs: tvs.map((s) => {
              const { id, seasons, episodes } = s;
              return {
                id,
                name: s.profile.name,
                poster_path: s.profile.poster_path,
                season_count: seasons.length,
                episode_count: episodes.length,
              };
            }),
          };
          payload.push(profile_payload);
        }
        const existing = await store.prisma.media_error_need_process.findFirst({
          where: {
            unique_id,
            type: MediaErrorTypes.TVProfile,
            user_id: user.id,
          },
        });
        if (existing) {
          await store.prisma.media_error_need_process.update({
            where: {
              id: existing.id,
            },
            data: {
              profile: JSON.stringify(payload),
              updated: dayjs().toISOString(),
            },
          });
          return;
        }
        await store.prisma.media_error_need_process.create({
          data: {
            id: r_id(),
            unique_id,
            type: MediaErrorTypes.TVProfile,
            profile: JSON.stringify(payload),
            user_id: user.id,
          },
        });
      })();
    }
  }
  /** 获取重复的季详情 */
  async find_duplicated_season(options: { user: User }) {
    const { user } = options;
    const store = this.store;
    const duplicate_season_profiles = await store.prisma.season_profile.groupBy({
      by: ["unique_id"],
      where: {},
      having: {
        unique_id: {
          _count: {
            gt: 1,
          },
        },
      },
    });
    for (let i = 0; i < duplicate_season_profiles.length; i += 1) {
      const { unique_id } = duplicate_season_profiles[i];
      const payload: SeasonProfileError[] = [];
      await (async () => {
        const profiles = await store.prisma.season_profile.findMany({
          where: {
            unique_id,
          },
          include: {
            seasons: {
              where: {
                user_id: user.id,
              },
              include: {
                _count: true,
                profile: true,
                tv: {
                  include: {
                    profile: true,
                  },
                },
                episodes: true,
              },
              orderBy: {
                profile: {
                  unique_id: "asc",
                },
              },
            },
          },
        });
        if (profiles.length === 0) {
          return;
        }
        for (let j = 0; j < profiles.length; j += 1) {
          const { id, name, season_number, seasons } = profiles[j];
          const profile_payload: SeasonProfileError = {
            id,
            name: (() => {
              if (seasons.length === 0) {
                return name;
              }
              const season = seasons[0];
              return season.tv.profile.name || season.tv.profile.original_name;
            })(),
            poster_path: (() => {
              if (seasons.length === 0) {
                return null;
              }
              const season = seasons[0];
              return season.profile.poster_path || season.tv.profile.poster_path;
            })(),
            season_number,
            season_count: seasons.length,
            seasons: seasons.map((s) => {
              const {
                id,
                tv: { id: tv_id, profile },
                episodes,
              } = s;
              return {
                id,
                tv_id,
                name: profile.name,
                poster_path: s.profile.poster_path || profile.poster_path,
                episode_count: episodes.length,
              };
            }),
          };
          payload.push(profile_payload);
        }
        const existing = await store.prisma.media_error_need_process.findFirst({
          where: {
            unique_id,
            type: MediaErrorTypes.SeasonProfile,
            user_id: user.id,
          },
        });
        if (existing) {
          await store.prisma.media_error_need_process.update({
            where: {
              id: existing.id,
            },
            data: {
              profile: JSON.stringify(payload),
              updated: dayjs().toISOString(),
            },
          });
          return;
        }
        await store.prisma.media_error_need_process.create({
          data: {
            id: r_id(),
            unique_id,
            type: MediaErrorTypes.SeasonProfile,
            profile: JSON.stringify(payload),
            user_id: user.id,
          },
        });
      })();
    }
  }
  /** 获取重复的剧集详情 */
  async find_duplicated_episode(options: { user: User }) {
    const { user } = options;
    const store = this.store;
    const duplicate_episode_profiles = await store.prisma.episode_profile.groupBy({
      by: ["unique_id"],
      where: {},
      having: {
        unique_id: {
          _count: {
            gt: 1,
          },
        },
      },
    });
    for (let i = 0; i < duplicate_episode_profiles.length; i += 1) {
      const { unique_id } = duplicate_episode_profiles[i];
      const payload: EpisodeProfileError[] = [];
      await (async () => {
        const profiles = await store.prisma.episode_profile.findMany({
          where: {
            unique_id,
          },
          include: {
            episodes: {
              where: {
                user_id: user.id,
              },
              include: {
                tv: {
                  include: {
                    profile: true,
                  },
                },
                parsed_episodes: true,
              },
            },
          },
        });
        if (profiles.length === 0) {
          return;
        }
        for (let j = 0; j < profiles.length; j += 1) {
          const { id, name, season_number, episode_number, episodes } = profiles[j];
          const profile_payload: EpisodeProfileError = {
            id,
            name: (() => {
              if (episodes.length === 0) {
                return name;
              }
              const tv = episodes[0].tv;
              return tv.profile.name || tv.profile.original_name;
            })(),
            poster_path: (() => {
              if (episodes.length === 0) {
                return null;
              }
              const tv = episodes[0].tv;
              return tv.profile.poster_path || tv.profile.poster_path;
            })(),
            season_number,
            episode_number,
            episode_count: episodes.length,
            episodes: episodes.map((s) => {
              const { id, season_id, tv, tv_id, parsed_episodes } = s;
              return {
                id,
                tv_id,
                name: tv.profile.name,
                poster_path: tv.profile.poster_path,
                season_id,
                episode_text: s.episode_text,
                season_text: s.season_text,
                source_count: parsed_episodes.length,
              };
            }),
          };
          payload.push(profile_payload);
        }
        const existing = await store.prisma.media_error_need_process.findFirst({
          where: {
            unique_id,
            type: MediaErrorTypes.EpisodeProfile,
            user_id: user.id,
          },
        });
        if (existing) {
          await store.prisma.media_error_need_process.update({
            where: {
              id: existing.id,
            },
            data: {
              profile: JSON.stringify(payload),
              updated: dayjs().toISOString(),
            },
          });
          return;
        }
        await store.prisma.media_error_need_process.create({
          data: {
            id: r_id(),
            unique_id,
            type: MediaErrorTypes.EpisodeProfile,
            profile: JSON.stringify(payload),
            user_id: user.id,
          },
        });
      })();
    }
  }
  async find_media_errors() {
    await this.walk_user(async (user) => {
      await this.find_tv_errors({ user });
      await this.find_season_errors({ user });
      await this.find_episode_errors({ user });
      await this.find_movie_errors({ user });
    });
  }
  async find_tv_errors(options: { user: User }) {
    const { user } = options;
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.tv.findMany({
          where: {
            user_id: user.id,
          },
          include: {
            profile: true,
            seasons: true,
            episodes: true,
          },
          orderBy: {
            profile: { first_air_date: "desc" },
          },
          ...extra,
        });
      },
      handler: async (data, index) => {
        const tv = data;
        const { id, seasons, episodes } = tv;
        const profile = tv.profile;
        const tips: string[] = [];
        if (episodes.length === 0) {
          tips.push("关联的剧集数为 0");
        }
        if (seasons.length === 0) {
          tips.push("关联的季数为 0");
        }
        if (tips.length === 0) {
          return;
        }
        const payload: TVError = {
          id,
          name: profile.name,
          poster_path: profile.poster_path,
          texts: tips,
        };
        const existing = await this.store.prisma.media_error_need_process.findFirst({
          where: {
            unique_id: tv.id,
            type: MediaErrorTypes.TV,
            user_id: user.id,
          },
        });
        if (existing) {
          await this.store.prisma.media_error_need_process.update({
            where: {
              id: existing.id,
            },
            data: {
              type: MediaErrorTypes.TV,
              profile: JSON.stringify(payload),
              updated: dayjs().toISOString(),
            },
          });
          return;
        }
        await this.store.prisma.media_error_need_process.create({
          data: {
            id: r_id(),
            unique_id: tv.id,
            type: MediaErrorTypes.TV,
            profile: JSON.stringify(payload),
            user_id: user.id,
          },
        });
      },
    });
  }
  async find_season_errors(options: { user: User }) {
    const { user } = options;
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.season.findMany({
          where: {
            user_id: user.id,
          },
          include: {
            _count: true,
            profile: true,
            sync_tasks: true,
            tv: {
              include: {
                _count: true,
                profile: true,
              },
            },
            episodes: {
              include: {
                parsed_episodes: true,
                profile: true,
                _count: true,
              },
              orderBy: {
                episode_number: "desc",
              },
            },
            parsed_episodes: true,
          },
          orderBy: {
            profile: { air_date: "desc" },
          },
          ...extra,
        });
      },
      handler: async (data, index) => {
        const season = data;
        const { id, tv_id, profile, season_text, tv, sync_tasks, _count, episodes } = season;
        const { episode_count } = profile;
        const incomplete = episode_count !== 0 && episode_count !== _count.episodes;
        const { name, poster_path, binds } = normalize_partial_tv({
          ...tv,
          sync_tasks,
        });
        const tips: string[] = [];
        if (tv.profile.in_production && incomplete && binds.length === 0) {
          tips.push("未完结但缺少更新任务");
        }
        if (!tv.profile.in_production && incomplete) {
          tips.push(`已完结但集数不完整，总集数 ${episode_count}，当前集数 ${_count.episodes}`);
        }
        const invalid_episodes = episodes.filter((e) => {
          return e.parsed_episodes.length === 0;
        });
        if (invalid_episodes.length !== 0) {
          tips.push(`存在${invalid_episodes.length}个没有视频源的剧集`);
        }
        if (tips.length === 0) {
          return;
        }
        const payload: SeasonError = {
          id,
          name,
          poster_path,
          season_text,
          tv_id,
          texts: tips,
        };
        const existing = await this.store.prisma.media_error_need_process.findFirst({
          where: {
            unique_id: season.id,
            type: MediaErrorTypes.Season,
            user_id: user.id,
          },
        });
        if (existing) {
          await this.store.prisma.media_error_need_process.update({
            where: {
              id: existing.id,
            },
            data: {
              type: MediaErrorTypes.Season,
              profile: JSON.stringify(payload),
              updated: dayjs().toISOString(),
            },
          });
          return;
        }
        await this.store.prisma.media_error_need_process.create({
          data: {
            id: r_id(),
            unique_id: season.id,
            type: MediaErrorTypes.Season,
            profile: JSON.stringify(payload),
            user_id: user.id,
          },
        });
      },
    });
  }
  async find_episode_errors(options: { user: User }) {
    const { user } = options;
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.episode.findMany({
          where: {
            user_id: user.id,
          },
          include: {
            profile: true,
            parsed_episodes: true,
            tv: {
              include: {
                profile: true,
              },
            },
          },
          orderBy: {
            profile: { air_date: "desc" },
          },
          ...extra,
        });
      },
      handler: async (data, index) => {
        const episode = data;
        const { id, episode_text, season_text, tv_id, season_id, tv, parsed_episodes } = episode;
        const profile = tv.profile;
        const tips: string[] = [];
        if (parsed_episodes.length === 0) {
          tips.push("视频源数量为 0");
        }
        if (tips.length === 0) {
          return;
        }
        const payload: EpisodeError = {
          id,
          name: profile.name,
          poster_path: profile.poster_path,
          episode_text,
          season_text,
          tv_id,
          season_id,
          texts: tips,
        };
        const existing = await this.store.prisma.media_error_need_process.findFirst({
          where: {
            unique_id: episode.id,
            type: MediaErrorTypes.Episode,
            user_id: user.id,
          },
        });
        if (existing) {
          await this.store.prisma.media_error_need_process.update({
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
        await this.store.prisma.media_error_need_process.create({
          data: {
            id: r_id(),
            unique_id: episode.id,
            type: MediaErrorTypes.Episode,
            profile: JSON.stringify(payload),
            user_id: user.id,
          },
        });
      },
    });
  }
  async find_movie_errors(options: { user: User }) {
    const { user } = options;
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.movie.findMany({
          where: {
            user_id: user.id,
          },
          include: {
            profile: true,
            parsed_movies: true,
          },
          orderBy: {
            profile: { air_date: "desc" },
          },
          ...extra,
        });
      },
      handler: async (data, index) => {
        const movie = data;
        const { id, profile, parsed_movies } = movie;
        const tips: string[] = [];
        if (parsed_movies.length === 0) {
          tips.push("视频源数量为 0");
        }
        if (tips.length === 0) {
          return;
        }
        const payload: MovieError = {
          id,
          name: profile.name,
          poster_path: profile.poster_path,
          texts: tips,
        };
        const existing = await this.store.prisma.media_error_need_process.findFirst({
          where: {
            unique_id: movie.id,
            type: MediaErrorTypes.Movie,
            user_id: user.id,
          },
        });
        if (existing) {
          await this.store.prisma.media_error_need_process.update({
            where: {
              id: existing.id,
            },
            data: {
              type: MediaErrorTypes.Movie,
              profile: JSON.stringify(payload),
              updated: dayjs().toISOString(),
            },
          });
          return;
        }
        await this.store.prisma.media_error_need_process.create({
          data: {
            id: r_id(),
            unique_id: movie.id,
            type: MediaErrorTypes.Movie,
            profile: JSON.stringify(payload),
            user_id: user.id,
          },
        });
      },
    });
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
  /**
   * 清理过期（在阿里云盘页面删除了文件或修改文件名这种情况）的文件
   */
  async clear_expired_drive_files() {
    const store = this.store;
    await this.walk_drive(async (drive, user) => {
      const where: ModelQuery<"file"> = {
        drive_id: drive.id,
        user_id: user.id,
      };
      const count = await store.prisma.file.count({ where });
      console.log(["共", String(count), "条记录"]);
      await walk_model_with_cursor({
        fn(extra) {
          return store.prisma.file.findMany({
            where,
            ...extra,
          });
        },
        async handler(item, index) {
          const prefix = `[${item.name}]`;
          const res = await drive.client.fetch_file(item.file_id);
          console.log([prefix, `第 ${index + 1}`]);
          if (res.error) {
            if (res.error.message.includes("file not exist")) {
              console.log([prefix, "删除云盘文件", item.name]);
              console.log(item.id);
              console.log(item.file_id);
              await store.prisma.file.delete({
                where: {
                  id: item.id,
                },
              });
              await store.prisma.parsed_episode.deleteMany({
                where: {
                  file_id: item.file_id,
                },
              });
              await store.prisma.parsed_movie.deleteMany({
                where: {
                  file_id: item.file_id,
                },
              });
            }
            return;
          }
          const { name, content_hash, size } = res.data;
          const payload: Partial<FileRecord> = {};
          if (!item.md5) {
            payload.md5 = content_hash;
          }
          if (!item.size) {
            payload.size = size;
          }
          if (item.name !== name) {
            payload.name = name;
          }
          if (Object.keys(payload).length === 0) {
            return;
          }
          console.log([prefix, "更新云盘文件"]);
          await store.prisma.file.update({
            where: {
              id: item.id,
            },
            data: payload,
          });
        },
      });
      console.log("处理完成");
    });
  }
}
