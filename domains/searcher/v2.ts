/**
 * @file 对解析出的影视剧结果进行搜索
 */
import dayjs from "dayjs";
import uniqueBy from "lodash/fp/uniqBy";

import { BaseDomain, Handler } from "@/domains/base";
import {
  EpisodeProfileFromTMDB,
  MovieProfileFromTMDB,
  PartialSeasonFromTMDB,
  TVProfileFromTMDB,
} from "@/domains/media_profile/tmdb/services";
import {
  Article,
  ArticleLineNode,
  ArticleListItemNode,
  ArticleListNode,
  ArticleSectionNode,
  ArticleTextNode,
} from "@/domains/article";
import { DatabaseStore } from "@/domains/store";
import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { FileUpload } from "@/domains/uploader";
import {
  MovieProfileRecord,
  TVProfileRecord,
  ModelQuery,
  TVRecord,
  EpisodeRecord,
  SeasonRecord,
  MovieRecord,
  ParsedMediaRecord,
  ParsedMediaSourceRecord,
  MediaProfileRecord,
  MediaSourceProfileRecord,
} from "@/domains/store/types";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { MediaProfileClient } from "@/domains/media_profile";
import { Result } from "@/types";
import { episode_to_num, r_id } from "@/utils";
import { parse_filename_for_video } from "@/utils/parse_filename_for_video";
import { MediaTypes } from "@/constants";

enum Events {
  TVAdded,
  SeasonAdded,
  EpisodeAdded,
  MovieAdded,
  Print,
  Stop,
  Percent,
  Finish,
  Error,
}
type TheTypesOfEvents = {
  [Events.TVAdded]: TVRecord;
  [Events.SeasonAdded]: SeasonRecord;
  [Events.EpisodeAdded]: EpisodeRecord;
  [Events.MovieAdded]: MovieRecord;
  [Events.Print]: ArticleLineNode | ArticleSectionNode;
  [Events.Percent]: number;
  [Events.Stop]: void;
  [Events.Finish]: void;
  [Events.Error]: Error;
};

type MediaSearcherProps = {
  /** 强制索引全部，忽略 can_search 为 0 */
  force?: boolean;
  unique_id?: string;
  /** 搜索到的影视剧中如果存在图片，是否要将图片上传到 cdn */
  upload_image?: boolean;
  /** 影视剧海报封面上传后的本地存储路径 */
  assets: string;
  /** 数据库实例 */
  store: DatabaseStore;
  /** 仅处理该网盘下的所有未匹配电视剧 */
  drive?: Drive;
  /** 仅处理该用户的所有未匹配电视剧 */
  user: User;
  /** 新增季时的回调 */
  on_season_added?: (season: SeasonRecord) => void;
  /** 新增剧集时的回调 */
  on_episode_added?: (episode: EpisodeRecord) => void;
  /** 新增电影时的回调 */
  on_movie_added?: (movie: MovieRecord) => void;
  /** 打印日志时的回调 */
  on_print?: (v: ArticleLineNode | ArticleSectionNode) => void;
  /** 搜索结束时的回调 */
  on_finish?: () => void;
  /** 发生错误时的回调 */
  on_error?: (v: Error) => void;
};

export class MediaSearcher extends BaseDomain<TheTypesOfEvents> {
  static New(body: MediaSearcherProps) {
    const {
      assets,
      force,
      unique_id,
      store,
      user,
      drive,
      on_season_added,
      on_episode_added,
      on_movie_added,
      on_print,
      on_finish,
      on_error,
    } = body;
    if (!user) {
      return Result.Err("缺少用户信息");
    }
    if (!user.settings.tmdb_token) {
      return Result.Err("缺少 TMDB token");
    }
    if (!assets) {
      return Result.Err("缺少静态资源根路径");
    }
    if (!store) {
      return Result.Err("缺少 store 实例");
    }
    const searcher = new MediaSearcher({
      assets,
      force,
      unique_id,
      user,
      drive,
      store,
      on_season_added,
      on_episode_added,
      on_movie_added,
      on_print,
      on_finish,
      on_error,
    });
    return Result.Ok(searcher);
  }

  store: DatabaseStore;
  user: User;
  drive?: Drive;
  client: MediaProfileClient;
  upload: FileUpload;
  options: Partial<{
    upload_image?: boolean;
    unique_id?: string;
    /** 忽略 can_search，强制重新搜索 */
    force?: boolean;
  }> = {};
  /** 是否终止本次搜索 */
  need_stop: boolean = false;

  constructor(options: MediaSearcherProps) {
    super();

    const {
      upload_image = true,
      force = false,
      assets,
      unique_id,
      user,
      drive,
      store,
      on_season_added,
      on_episode_added,
      on_movie_added,
      on_print,
      on_finish,
      on_error,
    } = options;
    this.store = store;
    this.user = user;
    this.drive = drive;
    this.upload = new FileUpload({ root: assets });
    this.client = new MediaProfileClient({
      token: user.settings.tmdb_token!,
      uploader: this.upload,
      store,
    });
    this.options = {
      upload_image,
      force,
      unique_id,
    };
    if (on_season_added) {
      this.on_add_season(on_season_added);
    }
    if (on_episode_added) {
      this.on_add_episode(on_episode_added);
    }
    if (on_movie_added) {
      this.on_add_movie(on_movie_added);
    }
    if (on_print) {
      this.on_print(on_print);
    }
    if (on_finish) {
      this.on_finish(on_finish);
    }
    if (on_error) {
      this.on_error(on_error);
    }
  }

  /** 开始搜索 */
  async run2(file_ids: string[] = []) {
    await this.process_parsed_media_source_list_by_file_id(file_ids);
    this.emit(Events.Finish);
    return Result.Ok(null);
  }
  async process_parsed_media_source_list_by_file_id(file_ids: string[]) {
    const { force = false } = this.options;
    const where: ModelQuery<"parsed_media_source"> = {
      media_source_id: null,
      file_id: {
        in: file_ids,
      },
      can_search: force ? undefined : 1,
      user_id: this.user.id,
    };
    if (this.drive) {
      where.drive_id = this.drive.id;
    }
    this.emit(Events.Print, Article.build_line(["搜索待查询记录", JSON.stringify(where)]));
    const count = await this.store.prisma.parsed_media_source.count({ where });
    this.emit(Events.Print, Article.build_line(["找到", count, "个需要搜索的记录"]));
    await walk_model_with_cursor({
      fn: (args) => {
        return this.store.prisma.parsed_media_source.findMany({
          where,
          include: {
            parsed_media: true,
          },
          orderBy: [
            {
              name: "desc",
            },
            {
              episode_text: "asc",
            },
          ],
          ...args,
        });
      },
      handler: async (parsed_media_source, i) => {
        const { type, name, original_name, season_text, episode_text } = parsed_media_source;
        const prefix = get_prefix_from_names({ name, original_name });
        this.emit(
          Events.Print,
          Article.build_line([`第${i + 1}个、`, prefix, [season_text, episode_text].filter(Boolean).join("/")])
        );
        const percent = (() => {
          const v = (i + 1) / count;
          if (v < 0.0001) {
            return 0.0001;
          }
          if (v >= 1) {
            return 1;
          }
          return Number(v.toFixed(4));
        })();
        // console.log("[DOMAIN]searcher/index - before process media", percent);
        this.emit(Events.Percent, percent);
        try {
          if (type === MediaTypes.Season) {
            const r = await this.process_season_media_source(parsed_media_source);
            if (r.error) {
              this.emit(Events.Print, Article.build_line([r.error.message]));
            }
            return;
          }
          if (type === MediaTypes.Movie) {
            const r = await this.process_movie_media_source(parsed_media_source);
            if (r.error) {
              this.emit(Events.Print, Article.build_line([r.error.message]));
            }
            return;
          }
          this.emit(Events.Print, Article.build_line(["未知的媒体类型"]));
        } catch (err) {
          const error = err as Error;
          this.emit(Events.Print, Article.build_line(["添加详情失败 catch", error.message]));
        }
      },
    });
    return Result.Ok(null);
  }
  /** 开始搜索 */
  async run(scope: { name: string }[] = []) {
    await this.process_parsed_media_source_list_by_unique_id();
    this.emit(Events.Finish);
    return Result.Ok(null);
  }
  async process_parsed_media_source_list_by_unique_id() {
    const { force } = this.options;
    const where: ModelQuery<"parsed_media_source"> = {
      media_source_id: null,
      cause_job_id: this.options.unique_id,
      can_search: force ? undefined : 1,
      user_id: this.user.id,
    };
    if (this.drive) {
      where.drive_id = this.drive.id;
    }
    this.emit(Events.Print, Article.build_line(["搜索待查询记录", JSON.stringify(where)]));
    const count = await this.store.prisma.parsed_media_source.count({ where });
    this.emit(Events.Print, Article.build_line(["找到", count, "个需要搜索的记录"]));
    await walk_model_with_cursor({
      fn: (args) => {
        return this.store.prisma.parsed_media_source.findMany({
          where,
          include: {
            parsed_media: true,
          },
          orderBy: [
            {
              name: "desc",
            },
            {
              episode_text: "asc",
            },
          ],
          ...args,
        });
      },
      handler: async (parsed_media_source, i) => {
        const { type, name, original_name, season_text, episode_text } = parsed_media_source;
        const prefix = get_prefix_from_names({ name, original_name });
        this.emit(
          Events.Print,
          Article.build_line([`第${i + 1}个、`, prefix, [season_text, episode_text].filter(Boolean).join("/")])
        );
        const percent = (() => {
          const v = (i + 1) / count;
          if (v < 0.0001) {
            return 0.0001;
          }
          if (v >= 1) {
            return 1;
          }
          return Number(v.toFixed(4));
        })();
        // console.log("[DOMAIN]searcher/index - before process media", percent);
        this.emit(Events.Percent, percent);
        try {
          if (type === MediaTypes.Season) {
            const r = await this.process_season_media_source(parsed_media_source);
            if (r.error) {
              this.emit(Events.Print, Article.build_line([r.error.message]));
            }
            return;
          }
          if (type === MediaTypes.Movie) {
            const r = await this.process_movie_media_source(parsed_media_source);
            if (r.error) {
              this.emit(Events.Print, Article.build_line([r.error.message]));
            }
            return;
          }
          this.emit(Events.Print, Article.build_line(["未知的媒体类型"]));
        } catch (err) {
          const error = err as Error;
          this.emit(Events.Print, Article.build_line(["添加详情失败 catch", error.message]));
        }
      },
    });
    return Result.Ok(null);
  }
  cached_media_profile_records: Record<
    string,
    null | (MediaProfileRecord & { source_profiles: MediaSourceProfileRecord[] })
  > = {};
  async process_season_media_source(
    parsed_media_source: ParsedMediaSourceRecord & { parsed_media: null | (ParsedMediaRecord & {}) }
  ) {
    const { name, original_name, season_text, episode_text, file_name, parsed_media } = parsed_media_source;
    const year = (() => {
      const y = parse_filename_for_video(file_name, ["year"]).year;
      if (y) {
        return y;
      }
      return null;
    })();
    const unique_key = [name, original_name, season_text, year].filter(Boolean).join("/");
    if (!episode_text) {
      await this.store.prisma.parsed_media_source.update({
        where: {
          id: parsed_media_source.id,
        },
        data: {
          cause_job_id: null,
          can_search: 0,
        },
      });
      return Result.Err("不存在剧集信息");
    }
    // console.log("process_season_media_source", parsed_media.media_id);
    const media_profile_record = await (async () => {
      if (parsed_media && parsed_media.media_profile_id) {
        if (this.cached_media_profile_records[parsed_media.media_profile_id]) {
          return this.cached_media_profile_records[parsed_media.media_profile_id];
        }
        const r = await this.store.prisma.media_profile.findFirst({
          where: {
            id: parsed_media.media_profile_id,
          },
          include: {
            source_profiles: true,
          },
        });
        if (r) {
          if (r.source_profiles.length === 0) {
            if (r.type === MediaTypes.Season) {
              const [series_id, season_number] = r.id.split("/").filter(Boolean).map(Number);
              if (season_number) {
                const r2 = await this.client.cache_season_profile({ tv_id: series_id, season_number });
                if (r2.data) {
                  r.source_profiles = r2.data.source_profiles;
                  this.cached_media_profile_records[parsed_media.media_profile_id] = r;
                  return r;
                }
              }
            }
          }
          this.cached_media_profile_records[parsed_media.media_profile_id] = r;
          return r;
        }
      }
      // 可能是 null，就避免了重复搜索同一个空结果
      if (this.cached_media_profile_records[unique_key] !== undefined) {
        return this.cached_media_profile_records[unique_key];
      }
      // console.log("before fetch_season_media_profile_record", name, original_name, unique_key);
      const r = await this.fetch_season_media_profile_record({
        name,
        original_name,
        season_text,
        year,
        parsed_media,
      });
      this.cached_media_profile_records[unique_key] = r;
      return r;
    })();
    if (media_profile_record === null) {
      this.cached_media_profile_records[unique_key] = null;
      await this.store.prisma.parsed_media_source.update({
        where: {
          id: parsed_media_source.id,
        },
        data: {
          cause_job_id: null,
          can_search: 0,
        },
      });
      return Result.Err("没有搜索到匹配结果");
    }
    const media = await this.get_season_media_record_by_profile(media_profile_record);
    if (parsed_media) {
      await this.store.prisma.parsed_media.update({
        where: {
          id: parsed_media.id,
        },
        data: {
          media_profile_id: media.profile_id,
        },
      });
    }
    const { source_profiles } = media_profile_record;
    // 根据 episode_text 匹配详情
    // console.log("before find_matched_source_profile", parsed_media_source.episode_text);
    const matched_source_profile = await this.find_matched_source_profile(source_profiles, parsed_media_source);
    if (!matched_source_profile) {
      await this.store.prisma.parsed_media_source.update({
        where: {
          id: parsed_media_source.id,
        },
        data: {
          cause_job_id: null,
          can_search: 0,
        },
      });
      return Result.Err("没有匹配到剧集");
    }
    this.emit(Events.Print, Article.build_line([`第${matched_source_profile.order}集`]));
    const media_source = await this.get_season_media_source_record_by_profile(matched_source_profile, {
      id: media.id,
      name: media_profile_record.name,
    });
    await this.store.prisma.parsed_media_source.update({
      where: {
        id: parsed_media_source.id,
      },
      data: {
        type: MediaTypes.Season,
        media_source_id: media_source.id,
      },
    });
    return Result.Ok(null);
  }
  async get_season_media_record_by_profile(media_profile_record: { id: string; name: string }) {
    const existing = await this.store.prisma.media.findFirst({
      where: {
        profile_id: media_profile_record.id,
        user_id: this.user.id,
      },
    });
    if (existing) {
      return existing;
    }
    const created = await this.store.prisma.media.create({
      data: {
        id: r_id(),
        type: MediaTypes.Season,
        text: [media_profile_record.name].join("/"),
        profile_id: media_profile_record.id,
        user_id: this.user.id,
      },
    });
    return created;
  }
  /**
   * 根据详情返回一个剧集记录
   * @param source_profile 剧集详情
   * @param media 关联新创建剧集记录的电视记录
   */
  async get_season_media_source_record_by_profile(source_profile: { id: string }, media: { id: string; name: string }) {
    const existing = await this.store.prisma.media_source.findFirst({
      where: {
        profile_id: source_profile.id,
        user_id: this.user.id,
      },
    });
    if (existing) {
      return existing;
    }
    const { name, id: media_id } = media;
    const created = await this.store.prisma.media_source.create({
      data: {
        id: r_id(),
        type: MediaTypes.Season,
        text: name,
        media_id,
        profile_id: source_profile.id,
        user_id: this.user.id,
      },
    });
    return created;
  }
  async find_matched_source_profile(
    source_profiles: MediaSourceProfileRecord[],
    parsed_source: { episode_text: string | null; file_name: string }
  ) {
    const { episode_text, file_name } = parsed_source;
    if (!episode_text) {
      return null;
    }
    // if (file_name.match(/第{0,1} {0,1}[0-9]{1,} {0,1}期/)) {
    // }
    if (episode_text.match(/^[0-9]{4,8}[上下]/)) {
      const r1 = episode_text.match(/^[0-9]{4,8}/);
      const r2 = episode_text.match(/[上下]/);
      if (r1 && r2) {
        const episode_text2 = r1[0];
        const order_text = r2[0];
        const matched_source_profiles = source_profiles.filter((source_profile) => {
          const { air_date } = source_profile;
          const year_and_month_day = dayjs(air_date).format("YYYYMMDD");
          const month_day = year_and_month_day.slice(4);
          if (episode_text2.length === 4) {
            if (episode_text2 === month_day) {
              return true;
            }
          }
          if (episode_text2.length === 8) {
            if (episode_text2 === year_and_month_day) {
              return true;
            }
          }
          return false;
        });
        if (matched_source_profiles.length === 1) {
          return matched_source_profiles[0];
        }
        if (matched_source_profiles.length === 2) {
          const [a1, b1] = matched_source_profiles.sort((a, b) => a.order - b.order);
          if (order_text === "上") {
            return a1;
          }
          if (order_text === "下") {
            return b1;
          }
        }
      }
    }
    if (episode_text.match(/^[0-9]{4,8}/)) {
      // 一般是综艺，按发布时间来匹配
      const matched_source_profiles = source_profiles.filter((source_profile) => {
        const { air_date } = source_profile;
        const year_and_month_day = dayjs(air_date).format("YYYYMMDD");
        const month_day = year_and_month_day.slice(4);
        if (episode_text.length === 4) {
          if (episode_text === month_day) {
            return true;
          }
        }
        if (episode_text.length === 8) {
          if (episode_text === year_and_month_day) {
            return true;
          }
        }
        return false;
      });
      if (matched_source_profiles.length === 1) {
        return matched_source_profiles[0];
      }
      if (matched_source_profiles.length === 2) {
        const r3 = file_name.match(/第[0-9]{1,}[期]([上下])/);
        if (r3) {
          const order_text = r3[1];
          const [a1, b1] = matched_source_profiles.sort((a, b) => a.order - b.order);
          if (order_text === "上") {
            return a1;
          }
          if (order_text === "下") {
            return b1;
          }
        }
      }
    }
    if (episode_text.match(/^[eE][0-9]{1,}/)) {
      // 正常的剧集，按第一集、第二集这种顺序来匹配
      const num = episode_to_num(episode_text);
      const matched_source_profiles = source_profiles.filter((source_profile) => {
        const { order } = source_profile;
        return num === order;
      });
      if (matched_source_profiles.length === 1) {
        return matched_source_profiles[0];
      }
      return null;
    }
    // 特殊的剧集，其实也基本上都是综艺的剧集，或者一些番外、彩蛋性质的
    const matched_source_profiles = source_profiles.filter((source_profile) => {
      return source_profile.name.includes(episode_text);
    });
    if (matched_source_profiles.length === 1) {
      return matched_source_profiles[0];
    }
    return null;
  }
  async process_movie_media_source(
    parsed_media_source: ParsedMediaSourceRecord & { parsed_media: null | (ParsedMediaRecord & {}) }
  ) {
    const { name, original_name, file_name, parsed_media } = parsed_media_source;
    const year = (() => {
      const y = parse_filename_for_video(file_name, ["year"]).year;
      if (y) {
        return y;
      }
      return null;
    })();
    const unique_key = [name, original_name, year].filter(Boolean).join("/");
    const media_profile_record = await (async () => {
      if (parsed_media && parsed_media.media_profile_id) {
        if (this.cached_media_profile_records[parsed_media.media_profile_id]) {
          return this.cached_media_profile_records[parsed_media.media_profile_id];
        }
        const r = await this.store.prisma.media_profile.findFirst({
          where: {
            id: parsed_media.media_profile_id,
          },
          include: {
            source_profiles: true,
          },
        });
        if (r) {
          this.cached_media_profile_records[parsed_media.media_profile_id] = r;
          return r;
        }
      }
      // 可能是 null，避免重复搜索空结果
      if (this.cached_media_profile_records[unique_key] !== undefined) {
        return this.cached_media_profile_records[unique_key];
      }
      const r = await this.fetch_movie_media_profile_record({
        name,
        original_name,
        year,
      });
      if (r) {
        this.cached_media_profile_records[unique_key] = r;
        return r;
      }
      return null;
    })();
    // const media_profile_record = await this.get_movie_media_record_by_profile(parsed_media);
    if (media_profile_record === null) {
      this.cached_media_profile_records[unique_key] = null;
      await this.store.prisma.parsed_media_source.update({
        where: {
          id: parsed_media_source.id,
        },
        data: {
          cause_job_id: null,
          can_search: 0,
        },
      });
      return Result.Err("没有搜索到匹配结果");
    }
    const media = await this.get_movie_media_record_by_profile(media_profile_record);
    if (parsed_media) {
      await this.store.prisma.parsed_media.update({
        where: {
          id: parsed_media.id,
        },
        data: {
          media_profile_id: media.profile_id,
        },
      });
    }
    const { source_profiles } = media_profile_record;
    const matched_source_profile = (() => {
      return source_profiles[0];
    })();
    if (!matched_source_profile) {
      await this.store.prisma.parsed_media_source.update({
        where: {
          id: parsed_media_source.id,
        },
        data: {
          cause_job_id: null,
          can_search: 0,
        },
      });
      return Result.Err("没有匹配到详情");
    }
    const media_source = await this.get_movie_media_source_record_by_profile(media_profile_record, media);
    await this.store.prisma.parsed_media_source.update({
      where: {
        id: parsed_media_source.id,
      },
      data: {
        type: MediaTypes.Movie,
        media_source_id: media_source.id,
      },
    });
    return Result.Ok(null);
  }
  async get_movie_media_record_by_profile(media_profile_record: { id: string; name: string; source_profiles?: {}[] }) {
    const existing = await this.store.prisma.media.findFirst({
      where: {
        profile_id: media_profile_record.id,
        user_id: this.user.id,
      },
    });
    if (existing) {
      return existing;
    }
    const created = await this.store.prisma.media.create({
      data: {
        id: r_id(),
        type: MediaTypes.Movie,
        text: media_profile_record.name,
        profile_id: media_profile_record.id,
        user_id: this.user.id,
      },
    });
    return created;
  }
  async get_movie_media_source_record_by_profile(source_profile: { id: string; name: string }, media: { id: string }) {
    const existing = await this.store.prisma.media_source.findFirst({
      where: {
        profile_id: source_profile.id,
        user_id: this.user.id,
      },
    });
    if (existing) {
      return existing;
    }
    const created = await this.store.prisma.media_source.create({
      data: {
        id: r_id(),
        type: MediaTypes.Movie,
        text: [source_profile.name].join("/"),
        media_id: media.id,
        profile_id: source_profile.id,
        user_id: this.user.id,
      },
    });
    return created;
  }
  async fetch_season_media_profile_record(parsed: {
    name: string | null;
    original_name: string | null;
    season_text: string | null;
    year: string | null;
    // file_name: string;
    parsed_media: ParsedMediaRecord | null;
  }) {
    const { season_text, year, parsed_media } = parsed;
    const prefix = get_prefix_from_names({ name: parsed.name, original_name: parsed.original_name });
    // log("[](search_tv_in_tmdb)start search", tv.name || tv.original_name);
    const existing = await (async () => {
      if (!parsed_media) {
        return null;
      }
      const result = await this.store.prisma.parsed_media.findFirst({
        where: {
          id: parsed_media.id,
        },
        include: {
          media_profile: {
            include: {
              source_profiles: true,
            },
          },
        },
      });
      return result;
    })();
    if (existing && existing.media_profile) {
      return existing.media_profile;
    }
    const season_profile = await (async () => {
      if (parsed.original_name) {
        const processed_original_name = parsed.original_name.split(".").join(" ");
        const r = await this.client.search_season({
          keyword: processed_original_name,
          year,
          season_text,
        });
        if (r.data !== null) {
          return r.data;
        }
      }
      if (parsed.name) {
        const r = await this.client.search_season({
          keyword: parsed.name,
          year,
          season_text,
        });
        if (r.data !== null) {
          return r.data;
        }
      }
      return null;
    })();
    // this.emit(Events.Print, Article.build_line([prefix, "没有查询到电视剧详情"]));
    if (season_profile === null) {
      return null;
    }
    this.emit(Events.Print, Article.build_line([`[${prefix}]`, "搜索到的电视剧为", season_profile.name]));
    const { id } = season_profile;
    const existing2 = await this.store.prisma.media_profile.findFirst({
      where: {
        id,
      },
      include: {
        source_profiles: true,
      },
    });
    if (existing2) {
      return existing2;
    }
    return null;
  }
  async fetch_movie_media_profile_record(parsed: {
    name: string | null;
    original_name: string | null;
    year: string | null;
  }) {
    const { year } = parsed;
    const prefix = get_prefix_from_names({ name: parsed.name, original_name: parsed.original_name });
    // log("[](search_tv_in_tmdb)start search", tv.name || tv.original_name);
    const movie_profile = await (async () => {
      if (parsed.original_name) {
        const processed_original_name = parsed.original_name.split(".").join(" ");
        const r = await this.client.search_movie({
          keyword: processed_original_name,
          year,
        });
        if (r.data !== null) {
          return r.data;
        }
      }
      if (parsed.name) {
        const r = await this.client.search_movie({
          keyword: parsed.name,
          year,
        });
        if (r.data !== null) {
          return r.data;
        }
      }
      return null;
    })();
    // this.emit(Events.Print, Article.build_line([prefix, "没有查询到电视剧详情"]));
    if (movie_profile === null) {
      return null;
    }
    this.emit(
      Events.Print,
      Article.build_line([`[${prefix}]`, "搜索到的电影为", movie_profile.name || movie_profile.original_name])
    );
    const {
      id,
      name,
      original_name,
      alias,
      overview,
      poster_path,
      air_date,
      order,
      origin_country,
      genres,
      vote_average,
    } = movie_profile;
    const existing2 = await this.store.prisma.media_profile.findFirst({
      where: {
        id,
      },
      include: {
        source_profiles: true,
      },
    });
    if (existing2) {
      return existing2;
    }
    return null;
  }
  /**
   * 格式化电视剧详情
   * 如下载 poster_path 等图片
   */
  async normalize_tv_profile(profile: TVProfileFromTMDB) {
    const { upload_image } = this.options;
    const {
      id,
      name,
      original_name,
      first_air_date,
      overview,
      poster_path,
      backdrop_path,
      popularity,
      vote_average,
      number_of_episodes,
      number_of_seasons,
      status,
      in_production,
      genres,
      origin_country,
    } = profile;
    const { poster_path: uploaded_poster_path, backdrop_path: uploaded_backdrop_path } = await (async () => {
      // console.log("check need upload images", upload_image);
      // this.emit(Events.Print, Article.build_line(["before check need upload image", upload_image]));
      if (upload_image) {
        return this.upload_tmdb_images({
          tmdb_id: id,
          poster_path,
          backdrop_path,
        });
      }
      return Promise.resolve({
        poster_path: poster_path || null,
        backdrop_path: backdrop_path || null,
      });
    })();
    // this.emit(Events.Print, Article.build_line(["before build body"]));
    const body = {
      unique_id: String(id),
      name: name || null,
      original_name: original_name || null,
      overview: overview || null,
      poster_path: uploaded_poster_path || null,
      backdrop_path: uploaded_backdrop_path || null,
      first_air_date,
      original_language: null,
      popularity,
      vote_average,
      vote_count: 0,
      episode_count: number_of_episodes,
      season_count: number_of_seasons,
      status,
      in_production: Number(in_production),
      genres: genres
        .map((g) => {
          return g.name;
        })
        .join("|"),
      origin_country: origin_country.join("|"),
    };
    return body;
  }
  cached_tv_profile: Record<string, TVProfileRecord> = {};
  /**
   * 处理从 TMDB 搜索到的季，主要是上传图片
   */
  async normalize_season_profile(latest_season: PartialSeasonFromTMDB) {
    const { upload_image } = this.options;
    const { id, name, overview, air_date, season_number, vote_average, episode_count, poster_path } = latest_season;
    return {
      unique_id: String(id),
      name,
      overview,
      episode_count,
      season_number: latest_season.season_number,
      vote_average,
      air_date,
      ...(await (async () => {
        if (upload_image) {
          const { poster_path: p } = await this.upload_tmdb_images({
            tmdb_id: `${id}-${season_number}`,
            poster_path,
            backdrop_path: null,
          });
          return {
            poster_path: p || null,
          };
        }
        return Promise.resolve({
          poster_path,
        });
      })()),
    };
  }
  normalize_episode_profile(profile: EpisodeProfileFromTMDB) {
    const { id, name, overview, air_date, runtime, episode_number, season_number } = profile;
    const body = {
      unique_id: String(id),
      name: name || null,
      overview: overview || null,
      air_date,
      runtime,
      episode_number,
      season_number,
    };
    return body;
  }
  /**
   * 格式化从 TMDB 搜索到的详情数据
   * 包括图片处理都是在这里做的
   */
  async normalize_movie_profile(profile: MovieProfileFromTMDB) {
    const { upload_image } = this.options;
    const {
      id,
      name,
      original_name,
      overview,
      poster_path,
      backdrop_path,
      popularity,
      genres,
      origin_country,
      vote_average,
      air_date,
      runtime,
    } = profile;
    const { poster_path: uploaded_poster_path, backdrop_path: uploaded_backdrop_path } = await (async () => {
      if (upload_image) {
        return this.upload_tmdb_images({
          tmdb_id: id,
          poster_path,
          backdrop_path,
        });
      }
      return Promise.resolve({
        poster_path,
        backdrop_path,
      });
    })();
    const body = {
      unique_id: String(id),
      name: name || null,
      original_name: original_name || null,
      overview: overview || null,
      poster_path: uploaded_poster_path || null,
      backdrop_path: uploaded_backdrop_path || null,
      original_language: null,
      air_date,
      popularity,
      vote_average,
      vote_count: 0,
      runtime,
      genres: genres
        .map((g) => {
          return g.name;
        })
        .join("|"),
      origin_country: origin_country.join("|"),
    };
    return body;
  }
  cached_movie_profiles: Record<string, MovieProfileRecord> = {};
  // async fetch_person_profile(unique_id: string | number) {
  //   const existing = await this.store.prisma.person_profile.findFirst({
  //     where: {
  //       unique_id: String(unique_id),
  //     },
  //   });
  //   if (existing) {
  //     return Result.Ok(existing);
  //   }
  //   const r2 = await this.client.fetch_person_profile({ person_id: unique_id });
  //   if (r2.error) {
  //     return Result.Err(r2.error.message);
  //   }
  //   const profile = r2.data;
  //   const { id, name, biography, birthday, place_of_birth, profile_path, known_for_department } = profile;
  //   const created = await this.store.prisma.person_profile.create({
  //     data: {
  //       id: r_id(),
  //       unique_id: String(id),
  //       sources: JSON.stringify({ tmdb_id: id }),
  //       name,
  //       biography,
  //       profile_path,
  //       birthday,
  //       place_of_birth,
  //       known_for_department,
  //     },
  //   });
  //   return Result.Ok(created);
  // }
  /** 获取指定季的参演人员 */
  // async insert_persons_of_season(season: {
  //   profile: SeasonProfileRecord & { persons: (PersonRecord & { profile: PersonProfileRecord })[] };
  //   tv: TVRecord & { profile: TVProfileRecord };
  // }) {
  //   if (!season.profile.season_number) {
  //     return Result.Err("没有季数");
  //   }
  //   const r = await this.client.fetch_persons_of_season({
  //     tv_id: season.tv.profile.unique_id,
  //     season_number: season.profile.season_number,
  //   });
  //   if (r.error) {
  //     return Result.Err(r.error.message);
  //   }
  //   const partial_persons_in_tmdb = r.data;
  //   for (let i = 0; i < partial_persons_in_tmdb.length; i += 1) {
  //     await (async () => {
  //       const person_in_tmdb = partial_persons_in_tmdb[i];
  //       // console.log(person_in_tmdb.name);
  //       if (season.profile.persons.find((p) => p.profile.unique_id === String(person_in_tmdb.id))) {
  //         this.emit(Events.Print, Article.build_line(["", person_in_tmdb.name, "已存在该季中，跳过"]));
  //         return;
  //       }
  //       const person_profile_r = await this.fetch_person_profile(person_in_tmdb.id);
  //       if (person_profile_r.error) {
  //         this.emit(Events.Print, Article.build_line(["获取演员详情失败，因为", person_profile_r.error.message]));
  //         return;
  //       }
  //       const person_profile_record = person_profile_r.data;
  //       const person_record = await (async () => {
  //         const ex = await this.store.prisma.person_in_media.findFirst({
  //           where: {
  //             id: r_id(),
  //             profile_id: person_profile_record.id,
  //             order: person_in_tmdb.order,
  //             season_id: season.profile.id,
  //           },
  //         });
  //         if (ex) {
  //           return ex;
  //         }
  //         const created = await this.store.prisma.person_in_media.create({
  //           data: {
  //             id: r_id(),
  //             profile_id: person_profile_record.id,
  //             name: person_in_tmdb.name,
  //             order: person_in_tmdb.order,
  //             season_id: season.profile.id,
  //           },
  //         });
  //         return created;
  //       })();
  //       await this.store.prisma.season_profile.update({
  //         where: {
  //           id: season.profile.id,
  //         },
  //         data: {
  //           persons: {
  //             connect: {
  //               id: person_record.id,
  //             },
  //           },
  //         },
  //       });
  //     })();
  //   }
  //   return Result.Ok(null);
  // }
  // /** 获取指定季的参演人员 */
  // async insert_persons_of_movie(
  //   movie: MovieRecord & {
  //     profile: MovieProfileRecord & { persons: (PersonRecord & { profile: PersonProfileRecord })[] };
  //   }
  // ) {
  //   const r = await this.client.fetch_persons_of_movie({
  //     movie_id: movie.profile.unique_id,
  //   });
  //   if (r.error) {
  //     return Result.Err(r.error.message);
  //   }
  //   const partial_persons_in_tmdb = r.data;
  //   for (let i = 0; i < partial_persons_in_tmdb.length; i += 1) {
  //     await (async () => {
  //       const person_in_tmdb = partial_persons_in_tmdb[i];
  //       // console.log(person_in_tmdb.name);
  //       if (movie.profile.persons.find((p) => p.profile.unique_id === String(person_in_tmdb.id))) {
  //         this.emit(Events.Print, Article.build_line(["", person_in_tmdb.name, "已存在该电影中，跳过"]));
  //         return;
  //       }
  //       const person_profile_r = await this.fetch_person_profile(person_in_tmdb.id);
  //       if (person_profile_r.error) {
  //         this.emit(Events.Print, Article.build_line(["获取演员详情失败，因为", person_profile_r.error.message]));
  //         return;
  //       }
  //       const person_profile_record = person_profile_r.data;
  //       const person_record = await (async () => {
  //         const ex = await this.store.prisma.person_in_media.findFirst({
  //           where: {
  //             id: r_id(),
  //             order: person_in_tmdb.order,
  //             profile_id: person_profile_record.id,
  //             movie_id: movie.profile_id,
  //           },
  //         });
  //         if (ex) {
  //           return ex;
  //         }
  //         const created = await this.store.prisma.person_in_media.create({
  //           data: {
  //             id: r_id(),
  //             name: person_in_tmdb.name,
  //             order: person_in_tmdb.order,
  //             known_for_department: person_in_tmdb.known_for_department,
  //             profile_id: person_profile_record.id,
  //             movie_id: movie.profile_id,
  //           },
  //         });
  //         return created;
  //       })();
  //       await this.store.prisma.movie_profile.update({
  //         where: {
  //           id: movie.profile_id,
  //         },
  //         data: {
  //           persons: {
  //             connect: {
  //               id: person_record.id,
  //             },
  //           },
  //         },
  //       });
  //     })();
  //   }
  //   return Result.Ok(null);
  // }
  /**
   * 上传 tmdb 图片到七牛云
   * @param tmdb
   * @returns
   */
  async upload_tmdb_images(tmdb: {
    tmdb_id: number | string;
    poster_path: string | null;
    backdrop_path: string | null;
  }) {
    const { tmdb_id, poster_path, backdrop_path } = tmdb;
    // log("[]upload_tmdb_images", tmdb_id, poster_path, backdrop_path);
    const result = {
      poster_path,
      backdrop_path,
    };
    const name = `${tmdb_id}.jpg`;
    if (poster_path) {
      const key = `/poster/${name}`;
      // this.emit(Events.Print, Article.build_line(["before upload.download poster", poster_path]));
      const r = await this.upload.download(poster_path, key);
      if (r.error) {
        // console.log("download image failed 1", r.error.message);
      }
      if (r.data) {
        result.poster_path = r.data;
      }
    }
    if (backdrop_path) {
      const key = `/backdrop/${name}`;
      // this.emit(Events.Print, Article.build_line(["before upload.download backdrop", backdrop_path]));
      const r = await this.upload.download(backdrop_path, key);
      if (r.error) {
        // console.log("download image failed 2", r.error.message);
      }
      if (r.data) {
        result.backdrop_path = r.data;
      }
    }
    // console.log("check need upload images result", result);
    // this.emit(Events.Print, Article.build_line(["before return result"]));
    return result;
  }

  stop() {
    if (this.need_stop) {
      return;
    }
    this.need_stop = true;
  }

  on_add_tv(handler: Handler<TheTypesOfEvents[Events.TVAdded]>) {
    return this.on(Events.TVAdded, handler);
  }
  on_add_season(handler: Handler<TheTypesOfEvents[Events.SeasonAdded]>) {
    return this.on(Events.SeasonAdded, handler);
  }
  on_add_episode(handler: Handler<TheTypesOfEvents[Events.EpisodeAdded]>) {
    return this.on(Events.EpisodeAdded, handler);
  }
  on_add_movie(handler: Handler<TheTypesOfEvents[Events.MovieAdded]>) {
    return this.on(Events.MovieAdded, handler);
  }
  on_print(handler: Handler<TheTypesOfEvents[Events.Print]>) {
    return this.on(Events.Print, handler);
  }
  on_percent(handler: Handler<TheTypesOfEvents[Events.Percent]>) {
    return this.on(Events.Percent, handler);
  }
  on_stop(handler: Handler<TheTypesOfEvents[Events.Stop]>) {
    return this.on(Events.Stop, handler);
  }
  on_finish(handler: Handler<TheTypesOfEvents[Events.Finish]>) {
    return this.on(Events.Finish, handler);
  }
  on_error(handler: Handler<TheTypesOfEvents[Events.Error]>) {
    return this.on(Events.Error, handler);
  }
}

function get_prefix_from_names(parsed_tv: { name: string | null; original_name: string | null }) {
  const { name, original_name } = parsed_tv;
  const prefix = `${name || original_name}`;
  return prefix;
}
function split_array_into_chunks<T extends Record<any, any>>(array: T[], n = 20) {
  const result = [];
  for (let i = 0; i < array.length; i += n) {
    result.push(array.slice(i, i + n));
  }
  return result;
}
