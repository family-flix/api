import dayjs from "dayjs";

import { DEFAULT_STATS, MediaErrorTypes, MediaTypes, ReportTypes, ResourceSyncTaskStatus } from "@/constants";
import { DatabaseStore } from "@/domains/store";
import { Statistics } from "@/domains/store/types";
import { User, UserSettings, UserUniqueID } from "@/domains/user";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { parse_token } from "@/domains/user/utils";
import { Drive } from "@/domains/drive/v2";
import { DriveTypes } from "@/domains/drive/constants";
import { Result } from "@/types";
import { parseJSONStr, r_id } from "@/utils";

export class Administrator extends User {
  static async New(token: string | undefined, store: DatabaseStore) {
    if (!token) {
      return Result.Err("缺少 token", 900);
    }
    const r = await parse_token({
      token,
      secret: User.SECRET,
    });
    if (r.error) {
      return Result.Err(r.error.message, 900);
    }
    const id = r.data.id as UserUniqueID;
    const existing = await store.prisma.user.findFirst({
      where: {
        id,
      },
      include: {
        settings: true,
        statistics: true,
      },
    });
    if (!existing) {
      return Result.Err("无效的 token", 900);
    }
    const settings = await User.parseSettings(existing.settings);
    // 要不要生成一个新的 token？
    const user = new Administrator({
      id,
      token,
      settings,
      statistics: (() => {
        if (!existing.statistics) {
          return DEFAULT_STATS;
        }
        const r = parseJSONStr<Statistics>(existing.statistics.data);
        if (r.error) {
          return DEFAULT_STATS;
        }
        return r.data;
      })(),
      store,
    });
    return Result.Ok(user);
  }
  static async Get(body: { id: string }, store: DatabaseStore) {
    const { id } = body;
    const existing = await store.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        settings: true,
        statistics: true,
      },
    });
    if (!existing) {
      return Result.Err("不存在");
    }
    const { settings: settings_str } = existing;
    const settings = await User.parseSettings(settings_str);
    return Result.Ok(
      new Administrator({
        id,
        token: "",
        settings,
        statistics: (() => {
          if (!existing.statistics) {
            return DEFAULT_STATS;
          }
          const r = parseJSONStr<Statistics>(existing.statistics.data);
          if (r.error) {
            return DEFAULT_STATS;
          }
          return r.data;
        })(),
        store,
      })
    );
  }

  statistics: Statistics;

  constructor(props: {
    id: string;
    token: string;
    settings?: UserSettings | null;
    statistics: Statistics;
    store: DatabaseStore;
  }) {
    super(props);

    const { statistics } = props;
    this.statistics = statistics;
  }

  async update_stats(changed: Partial<Statistics>) {
    const record = await (async () => {
      const e = await this.store.prisma.statistics.findFirst({
        where: {
          user_id: this.id,
        },
      });
      if (!e) {
        const created = await this.store.prisma.statistics.create({
          data: {
            id: r_id(),
            data: JSON.stringify(DEFAULT_STATS),
            user_id: this.id,
          },
        });
        return created;
      }
      return e;
    })();
    const prev = parseJSONStr<Statistics>(record.data);
    const data = {
      ...DEFAULT_STATS,
      ...prev,
      ...changed,
    };
    await this.store.prisma.statistics.update({
      where: {
        id: record.id,
      },
      data: {
        data: JSON.stringify(data),
        updated: dayjs().toISOString(),
        user_id: this.id,
      },
    });
    return Result.Ok(null);
  }
  async refresh_stats() {
    const store = this.store;
    const payload: Statistics = {
      drive_count: await store.prisma.drive.count({
        where: {
          user_id: this.id,
        },
      }),
      drive_total_size_count: 0,
      drive_used_size_count: 0,
      /** 电视剧总数 */
      season_count: await store.prisma.media.count({
        where: {
          type: MediaTypes.Season,
          user_id: this.id,
        },
      }),
      /** 电影总数 */
      movie_count: await store.prisma.media.count({
        where: {
          type: MediaTypes.Movie,
          user_id: this.id,
        },
      }),
      /** 剧集总数 */
      episode_count: await store.prisma.media_source.count({
        where: {
          type: MediaTypes.Season,
          user_id: this.id,
        },
      }),
      /** 所有同步任务数 */
      sync_task_count: await store.prisma.resource_sync_task.count({
        where: {
          status: ResourceSyncTaskStatus.WorkInProgress,
          invalid: 0,
          user_id: this.id,
        },
      }),
      /** 存在问题的同步任务数 */
      invalid_sync_task_count: await store.prisma.resource_sync_task.count({
        where: {
          invalid: 1,
          user_id: this.id,
        },
      }),
      /** 存在问题的电视剧数 */
      invalid_season_count: await store.prisma.invalid_media.count({
        where: {
          type: MediaErrorTypes.Season,
          user_id: this.id,
        },
      }),
      /** 存在问题的电影数 */
      invalid_movie_count: await store.prisma.invalid_media.count({
        where: {
          type: MediaErrorTypes.Season,
          user_id: this.id,
        },
      }),
      /** 未识别的解析结果数 */
      unknown_media_count: await store.prisma.parsed_media.count({
        where: {
          media_profile_id: null,
          user_id: this.id,
        },
      }),
      /** 用户反馈问题数 */
      report_count: await store.prisma.report_v2.count({
        where: {
          type: {
            in: [ReportTypes.Movie, ReportTypes.TV, ReportTypes.Question],
          },
          OR: [
            {
              answer: null,
            },
            {
              answer: "",
            },
          ],
          user_id: this.id,
        },
      }),
      /** 用户「想看」请求数 */
      media_request_count: await store.prisma.report_v2.count({
        where: {
          type: ReportTypes.Want,
          OR: [
            {
              answer: null,
            },
            {
              answer: "",
            },
          ],
          user_id: this.id,
        },
      }),
      updated_at: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    };
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.drive.findMany({
          where: {
            // type: DriveTypes.AliyunBackupDrive,
            user_id: this.id,
          },
          ...extra,
        });
      },
      handler: async (data, index) => {
        const { id } = data;
        const drive_res = await Drive.Get({ id, user: this, store: this.store });
        if (drive_res.error) {
          return;
        }
        const drive = drive_res.data;
        if (drive.type === DriveTypes.AliyunBackupDrive) {
          return;
        }
        const { total_size, used_size } = drive.profile;
        payload.drive_used_size_count += used_size || 0;
        payload.drive_total_size_count += total_size || 0;
        return Result.Ok(null);
      },
    });
    const e = await store.prisma.statistics.findFirst({
      where: {
        user_id: this.id,
      },
    });
    const {
      drive_count,
      drive_total_size_count,
      drive_used_size_count,
      movie_count,
      season_count,
      episode_count,
      sync_task_count,
      report_count,
      media_request_count,
      invalid_season_count,
      invalid_movie_count,
      invalid_sync_task_count,
      unknown_media_count,
      updated_at,
    } = payload;
    const d: Statistics = {
      drive_count,
      drive_total_size_count,
      drive_used_size_count,
      movie_count,
      season_count,
      episode_count,
      sync_task_count,
      report_count,
      media_request_count,
      invalid_season_count,
      invalid_movie_count,
      invalid_sync_task_count,
      unknown_media_count,
      updated_at,
    };
    if (!e) {
      await store.prisma.statistics.create({
        data: {
          id: r_id(),
          data: JSON.stringify(d),
          user_id: this.id,
        },
      });
      return;
    }
    await store.prisma.statistics.update({
      where: {
        id: e.id,
      },
      data: {
        data: JSON.stringify(d),
        updated: dayjs().toISOString(),
        user_id: this.id,
      },
    });
  }
}
