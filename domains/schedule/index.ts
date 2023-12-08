import dayjs from "dayjs";

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

export class ScheduleTask {
  store: DatabaseStore;
  app: Application;

  constructor(props: { app: Application; store: DatabaseStore }) {
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
  /** 刷新发布时间在近3月的所有电影详情 */
  async refresh_media_profile_list_of_user(values: { user: User }) {
    const { user } = values;
    const job_res = await Job.New({
      desc: "[定时任务]更新电视剧、电影信息",
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
  /** 获取重复的电影详情 */
  async duplicated_movies(options: { store: DatabaseStore; user: User }) {
    const { user, store } = options;
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
    const records: {
      index: number;
      unique_id: string;
      profiles: {}[];
    }[] = [];
    for (let i = 0; i < duplicate_movie_profiles.length; i += 1) {
      const { unique_id } = duplicate_movie_profiles[i];
      const payload = {
        index: i,
        type: MediaErrorTypes.MovieProfile,
        unique_id,
        profiles: [],
      } as (typeof records)[number];
      await (async () => {
        console.log(unique_id);
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
          const profile_payload = {
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
                tv: { profile },
                episodes,
              } = s;
              return {
                poster: s.profile.poster_path || profile.poster_path,
                episode_count: episodes.length,
              };
            }),
          };
          payload.profiles.push(profile_payload);
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
  // async update_duplicated_season() {
  //   walk_model_with_cursor({
  //     fn: (extra) => {
  //       return this.store.prisma.media_error_need_process.findMany({
  //         where: {
  //           type: MediaErrorTypes.SeasonProfile,
  //         },
  //         ...extra,
  //       });
  //     },
  //     handler(data, index) {
  //       const { profile } = data;
  //       if (!profile) {
  //         return;
  //       }
  //       const d = JSON.parse(profile);
  //     },
  //   });
  // }
  async update_duplicated_medias() {
    await this.walk_user(async (user) => {
      await this.duplicated_episode({ user });
      await this.duplicated_season({ user });
    });
  }
  /** 获取重复的季详情 */
  async duplicated_season(options: { user: User }) {
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
    const records: {
      index: number;
      unique_id: string;
      profiles: {}[];
    }[] = [];
    for (let i = 0; i < duplicate_season_profiles.length; i += 1) {
      const { unique_id } = duplicate_season_profiles[i];
      const payload = {
        index: i,
        type: MediaErrorTypes.SeasonProfile,
        unique_id,
        profiles: [],
      } as (typeof records)[number];
      await (async () => {
        console.log(unique_id);
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
          const profile_payload = {
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
                tv: { profile },
                episodes,
              } = s;
              return {
                poster: s.profile.poster_path || profile.poster_path,
                episode_count: episodes.length,
              };
            }),
          };
          payload.profiles.push(profile_payload);
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
  async duplicated_episode(options: { user: User }) {
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
    const records: {
      index: number;
      unique_id: string;
      profiles: {}[];
    }[] = [];
    for (let i = 0; i < duplicate_episode_profiles.length; i += 1) {
      const { unique_id } = duplicate_episode_profiles[i];
      const payload = {
        index: i,
        unique_id,
        type: MediaErrorTypes.EpisodeProfile,
        profiles: [],
      } as (typeof records)[number];
      await (async () => {
        console.log(unique_id);
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
                season: {
                  include: {
                    profile: true,
                    tv: {
                      include: {
                        profile: true,
                      },
                    },
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
          const profile_payload = {
            id,
            name: (() => {
              if (episodes.length === 0) {
                return name;
              }
              const season = episodes[0].season;
              return season.tv.profile.name || season.tv.profile.original_name;
            })(),
            poster_path: (() => {
              if (episodes.length === 0) {
                return null;
              }
              const season = episodes[0].season;
              return season.profile.poster_path || season.tv.profile.poster_path;
            })(),
            season_number,
            episode_number,
            episode_count: episodes.length,
            episodes: episodes.map((s) => {
              const { parsed_episodes } = s;
              return {
                sources_count: parsed_episodes.length,
              };
            }),
          };
          payload.profiles.push(profile_payload);
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
    // console.log(records);
  }
  async walk_season() {
    await this.walk_user(async (user) => {
      await this.find_season_errors({ user });
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
        const { profile, tv, sync_tasks, _count, episodes } = season;
        const { episode_count } = profile;
        const incomplete = episode_count !== 0 && episode_count !== _count.episodes;
        const { binds } = normalize_partial_tv({
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
        if (invalid_episodes) {
          tips.push(`存在${invalid_episodes.length}个没有视频源的剧集`);
        }
        if (tips.length === 0) {
          return;
        }
        const payload = {
          index,
          unique_id: season.id,
          type: MediaErrorTypes.Season,
          profile: tips,
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

  async update_stats() {
    const store = this.store;
    await this.walk_user(async (user) => {
      const payload = {
        drive_count: 0,
        drive_total_size_count: 0,
        drive_used_size_count: 0,
        movie_count: await store.prisma.movie.count({
          where: {
            user_id: user.id,
          },
        }),
        season_count: await store.prisma.season.count({
          where: {
            user_id: user.id,
          },
        }),
        tv_count: await store.prisma.tv.count({
          where: {
            user_id: user.id,
          },
        }),
        episode_count: await store.prisma.episode.count({
          where: {
            user_id: user.id,
          },
        }),
        sync_task_count: await store.prisma.bind_for_parsed_tv.count({
          where: {
            season_id: {
              not: null,
            },
            invalid: 0,
            in_production: 1,
            user_id: user.id,
          },
        }),
        invalid_sync_task_count: await store.prisma.bind_for_parsed_tv.count({
          where: {
            invalid: 1,
            user_id: user.id,
          },
        }),
        invalid_season_count: await store.prisma.media_error_need_process.count({
          where: {
            type: MediaErrorTypes.Season,
            user_id: user.id,
          },
        }),
        report_count: await store.prisma.report.count({
          where: {
            type: {
              in: [ReportTypes.Movie, ReportTypes.TV, ReportTypes.Question],
            },
            answer: null,
            user_id: user.id,
          },
        }),
        media_request_count: await store.prisma.report.count({
          where: {
            type: ReportTypes.Want,
            answer: null,
            user_id: user.id,
          },
        }),
      };
      await this.walk_drive(async (drive, user) => {
        const { total_size, used_size } = drive.profile;
        payload.drive_used_size_count += used_size || 0;
        payload.drive_total_size_count += total_size || 0;
        return Result.Ok(null);
      });
      const e = await store.prisma.statistics.findFirst({
        where: {
          user_id: user.id,
        },
      });
      const {
        drive_count,
        drive_total_size_count,
        drive_used_size_count,
        movie_count,
        tv_count,
        season_count,
        episode_count,
        sync_task_count,
        report_count,
        media_request_count,
        invalid_season_count,
        invalid_sync_task_count,
      } = payload;
      if (!e) {
        await store.prisma.statistics.create({
          data: {
            id: r_id(),
            drive_count: String(drive_count),
            drive_total_size_count: String(drive_total_size_count),
            drive_used_size_count: String(drive_used_size_count),
            movie_count: String(movie_count),
            tv_count: String(tv_count),
            season_count: String(season_count),
            episode_count: String(episode_count),
            sync_task_count: String(sync_task_count),
            report_count: String(report_count),
            media_request_count: String(media_request_count),
            invalid_season_count: String(invalid_season_count),
            invalid_sync_task_count: String(invalid_sync_task_count),
            user_id: user.id,
          },
        });
        return;
      }
      await store.prisma.statistics.update({
        where: {
          id: e.id,
        },
        data: {
          drive_count: String(drive_count),
          drive_total_size_count: String(drive_total_size_count),
          drive_used_size_count: String(drive_used_size_count),
          movie_count: String(movie_count),
          tv_count: String(tv_count),
          season_count: String(season_count),
          episode_count: String(episode_count),
          sync_task_count: String(sync_task_count),
          invalid_season_count: String(invalid_season_count),
          invalid_sync_task_count: String(invalid_sync_task_count),
          report_count: String(report_count),
          media_request_count: String(media_request_count),
          updated: dayjs().toISOString(),
        },
      });
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
}
