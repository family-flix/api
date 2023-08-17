/**
 * @file 影视剧搜索
 */
import type { Handler } from "mitt";
import uniqueBy from "lodash/fp/uniqBy";

import { BaseDomain } from "@/domains/base";
import { TMDBClient } from "@/domains/tmdb";
import {
  EpisodeProfileFromTMDB,
  MovieProfileFromTMDB,
  PartialSeasonFromTMDB,
  SeasonProfileFromTMDB,
  TVProfileFromTMDB,
} from "@/domains/tmdb/services";
import { ArticleLineNode, ArticleSectionNode, ArticleTextNode } from "@/domains/article";
import { DatabaseStore } from "@/domains/store";
import { ImageUploader } from "@/domains/uploader";
import {
  MovieProfileRecord,
  ParsedMovieRecord,
  ParsedEpisodeRecord,
  ParsedSeasonRecord,
  ParsedTVRecord,
  TVProfileRecord,
  SeasonProfileRecord,
  EpisodeProfileRecord,
  ModelQuery,
  ModelWhereInput,
} from "@/domains/store/types";
import { Result, Unpacked } from "@/types";
import { episode_to_num, r_id, season_to_num, sleep } from "@/utils";

import { extra_searched_tv_field } from "./utils";

enum Events {
  AddTV,
  AddSeason,
  AddEpisode,
  AddMovie,
  Print,
  Finish,
  Error,
}
type TheTypesOfEvents = {
  [Events.AddTV]: void;
  [Events.AddSeason]: void;
  [Events.AddEpisode]: void;
  [Events.AddMovie]: void;
  [Events.Print]: ArticleLineNode | ArticleSectionNode;
  [Events.Finish]: void;
  [Events.Error]: Error;
};

type MediaSearcherProps = {
  /** 数据库操作 */
  store: DatabaseStore;
  /** 搜索到的电视剧、季和剧集中如果存在图片，是否要将图片上传到 cdn */
  upload_image?: boolean;
  /** 仅处理该网盘下的所有未匹配电视剧 */
  drive_id?: string;
  /** 仅处理该用户的所有未匹配电视剧 */
  user_id?: string;
  /** 强制索引全部，忽略 can_search 为 0 */
  force?: boolean;
  assets: string;
  /** TMDB token */
  tmdb_token: string;
  on_print?: (v: ArticleLineNode | ArticleSectionNode) => void;
  on_finish?: () => void;
  on_error?: (v: Error) => void;
};

const PAGE_SIZE = 20;
export class MediaSearcher extends BaseDomain<TheTypesOfEvents> {
  static New(body: Partial<MediaSearcherProps>) {
    const { user_id, drive_id, tmdb_token, assets, force, store, on_print, on_finish, on_error } = body;
    if (!store) {
      return Result.Err("缺少 store 实例");
    }
    if (!tmdb_token) {
      return Result.Err("缺少 TMDB token");
    }
    if (!assets) {
      return Result.Err("缺少静态资源根路径");
    }
    const searcher = new MediaSearcher({
      user_id,
      drive_id,
      force,
      tmdb_token: tmdb_token,
      assets,
      store,
      on_print,
      on_finish,
      on_error,
    });
    return Result.Ok(searcher);
  }

  force: boolean;
  store: DatabaseStore;
  client: TMDBClient;
  upload: ImageUploader;
  options: Partial<{
    drive_id?: string;
    user_id?: string;
    upload_image?: boolean;
  }> = {};

  /** 是否暂停本次搜索 */
  _stop: boolean = false;

  constructor(options: MediaSearcherProps) {
    super();

    const {
      upload_image = true,
      user_id,
      drive_id,
      force = false,
      assets,
      tmdb_token: token,
      store,
      on_print,
      on_finish,
      on_error,
    } = options;
    this.store = store;
    this.force = force;
    this.client = new TMDBClient({ token });
    this.upload = new ImageUploader({ root: assets });
    this.options = {
      user_id,
      drive_id,
      upload_image,
    };
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
  async run(scope: { name: string }[] = []) {
    // console.log("[DOMAIN]MediaSearcher - run", scope);
    const files = uniqueBy((obj) => obj.name, scope);
    const file_groups = split_array_into_chunks(
      files.filter((f) => {
        return !!f.name;
      }),
      10
    );
    for (let i = 0; i < file_groups.length; i += 1) {
      await this.process_parsed_tv_list(file_groups[i]);
    }
    for (let i = 0; i < file_groups.length; i += 1) {
      await this.process_parsed_season_list(file_groups[i]);
    }
    for (let i = 0; i < file_groups.length; i += 1) {
      await this.process_parsed_episode_list(file_groups[i]);
    }
    for (let i = 0; i < file_groups.length; i += 1) {
      await this.process_parsed_movie_list(file_groups[i]);
    }
    this.emit(Events.Finish);
    return Result.Ok(null);
  }
  /** 处理所有没有匹配好电视剧详情的电视剧 */
  async process_parsed_tv_list(scope?: { name: string }[]) {
    // console.log("[DOMAIN]searcher/index - process_parsed_tv_list", scope, this.force);
    const { user_id, drive_id } = this.options;
    let page = 1;
    let no_more = false;
    const store = this.store;
    const where: NonNullable<Parameters<typeof store.prisma.parsed_tv.findMany>[number]>["where"] = {
      tv_id: null,
      can_search: this.force ? undefined : 1,
      user_id,
    };
    if (drive_id) {
      where.drive_id = drive_id;
    }
    if (scope && scope.length && scope.length <= 10) {
      where.OR = scope.map((s) => {
        const { name } = s;
        return {
          name: {
            contains: name,
          },
        };
      });
    }
    // console.log("[DOMAIN]searcher/index - process_parsed_tv_list where is", JSON.stringify(where, null, 2));
    const count = await store.prisma.parsed_tv.count({
      where,
    });
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["找到", count, "个需要搜索的电视剧"].map((text) => {
          return new ArticleTextNode({ text: String(text) });
        }),
      })
    );
    do {
      const parsed_tv_list = await store.prisma.parsed_tv.findMany({
        where,
        include: {
          parsed_episodes: true,
          parsed_seasons: true,
        },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: {
          name: "desc",
        },
      });
      //       log("找到", parsed_tv_list.length, "个需要搜索的电视剧");
      no_more = parsed_tv_list.length + (page - 1) * PAGE_SIZE >= count;
      page += 1;
      for (let i = 0; i < parsed_tv_list.length; i += 1) {
        const parsed_tv = parsed_tv_list[i];
        const prefix = get_prefix_from_parsed_tv(parsed_tv);
        // if (on_stop) {
        //   const r = await on_stop();
        //   if (r.data) {
        //     return;
        //   }
        // }
        const r = await this.search_tv_profile_then_link_parsed_tv(parsed_tv);
        // console.log("after this.search_tv_profile_then_link_parsed_tv");
        if (r.error) {
          this.emit(
            Events.Print,
            new ArticleLineNode({
              children: [`[${prefix}]`, "添加电视剧详情失败", r.error.message].map((text) => {
                return new ArticleTextNode({ text });
              }),
            })
          );
          //   log(`[${prefix}]`, "添加电视剧详情失败", r.error.message);
          continue;
        }
        // log(`[${prefix}]`, "添加电视剧详情成功");
        await (async () => {
          // console.log(`[${prefix}]`, "检查能否建立同步任务", r.data.profile.in_production, parsed_tv.file_name);
          if (r.data.profile.in_production && parsed_tv.file_name) {
            // console.log(`[${prefix}]`, "处于更新中");
            const body = {
              name: parsed_tv.file_name,
              user_id,
            };
            if (drive_id) {
              // @ts-ignore
              body.drive_id = drive_id;
            }
            const transfer_res = await this.store.find_shared_file_save(body);
            if (transfer_res.error) {
              // console.log(`[${prefix}]`, "获取转存记录失败", transfer_res.error.message);
              this.emit(
                Events.Print,
                new ArticleLineNode({
                  children: [`[${prefix}]`, "建立同步任务失败", transfer_res.error.message].map((text) => {
                    return new ArticleTextNode({ text: String(text) });
                  }),
                })
              );
              return;
            }
            if (!transfer_res.data) {
              // console.log(`[${prefix}]`, "不存在转存记录");
              this.emit(
                Events.Print,
                new ArticleLineNode({
                  children: [`[${prefix}]`, "建立同步任务失败", "不存在同名转存记录"].map((text) => {
                    return new ArticleTextNode({ text: String(text) });
                  }),
                })
              );
              return;
            }
            // console.log(`[${prefix}]`, "建立一个资源同步任务");
            const { url, file_id, name } = transfer_res.data;
            const r = await this.store.add_sync_task({
              url,
              file_id,
              name,
              in_production: 1,
              parsed_tv_id: parsed_tv.id,
              user_id,
            });
            if (r.error) {
              this.emit(
                Events.Print,
                new ArticleLineNode({
                  children: [`[${prefix}]`, "建立同步任务失败", r.error.message].map((text) => {
                    return new ArticleTextNode({ text: String(text) });
                  }),
                })
              );
              return;
            }
            this.emit(
              Events.Print,
              new ArticleLineNode({
                children: [`[${prefix}]`, "建立同步任务成功"].map((text) => {
                  return new ArticleTextNode({ text: String(text) });
                }),
              })
            );
            //     log(`[${prefix}]`, "建立资源同步任务成功");
          }
        })();
      }
    } while (no_more === false);
  }
  async search_tv_profile_then_link_parsed_tv(parsed_tv: ParsedTVRecord) {
    const { id } = parsed_tv;
    const profile_res = await this.get_tv_profile(parsed_tv);
    if (profile_res.error) {
      return Result.Err(profile_res.error);
    }
    if (profile_res.data === null) {
      this.store.update_parsed_tv(id, {
        can_search: 0,
      });
      return Result.Err("没有搜索到电视剧详情");
    }
    return this.link_tv_to_parsed_tv({
      profile: profile_res.data,
      parsed_tv,
    });
  }
  /** 将一条 tv 记录关联到 parsed_tv 记录，如果没有 tv 记录，就创建再关联 */
  async link_tv_to_parsed_tv(body: { parsed_tv: ParsedTVRecord; profile: TVProfileRecord }) {
    const { profile, parsed_tv } = body;
    const { user_id } = this.options;
    const prefix = get_prefix_from_parsed_tv(parsed_tv);

    const tv_res = await (async () => {
      const existing_res = await this.store.find_tv({
        profile_id: profile.id,
        user_id,
      });
      if (existing_res.error) {
        return Result.Err(existing_res.error);
      }
      if (existing_res.data) {
        // console.log(`[${prefix}]`, "已存在电视剧，直接关联");
        return Result.Ok(existing_res.data);
      }
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [`[${prefix}]`, "新增电视剧"].map((text) => {
            return new ArticleTextNode({ text: String(text) });
          }),
        })
      );
      //       log(`[${prefix}]`, "新增电视剧并关联");
      const adding_res = await this.store.add_tv({
        profile_id: profile.id,
        user_id,
      });
      if (adding_res.error) {
        return Result.Err(adding_res.error, undefined, { id: profile.id });
      }
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [`[${prefix}]`, "新增电视剧详情成功"].map((text) => {
            return new ArticleTextNode({ text });
          }),
        })
      );
      return Result.Ok(adding_res.data);
    })();
    if (tv_res.error) {
      return Result.Err(tv_res.error);
    }
    const tv = tv_res.data;
    const r = await this.store.update_parsed_tv(parsed_tv.id, {
      tv_id: tv.id,
      can_search: 0,
    });
    if (r.error) {
      return Result.Err(r.error, 10003);
    }
    return Result.Ok({
      ...tv,
      profile,
    });
  }
  /** 根据 parsed_tv 搜索电视剧详情 */
  async get_tv_profile(tv: ParsedTVRecord) {
    const { name, original_name, correct_name } = tv;
    const prefix = get_prefix_from_parsed_tv(tv);
    // log("[](search_tv_in_tmdb)start search", tv.name || tv.original_name);
    let tv_profile = null;
    if (correct_name) {
      // console.log(`[${prefix}]`, "使用", correct_name, "搜索");
      const r = await this.search_tv_in_tmdb(correct_name);
      if (r.error) {
        return Result.Err(r.error);
      }
      tv_profile = r.data;
    }
    if (tv_profile === null && name) {
      // console.log(`[${prefix}]`, "使用", name, "搜索");
      const r = await this.search_tv_in_tmdb(name);
      if (r.error) {
        return Result.Err(r.error);
      }
      tv_profile = r.data;
    }
    if (tv_profile === null && original_name) {
      // console.log(`[${prefix}]`, "使用", original_name, "搜索");
      const processed_original_name = original_name.split(".").join(" ");
      const r = await this.search_tv_in_tmdb(processed_original_name);
      if (r.error) {
        return Result.Err(r.error);
      }
      tv_profile = r.data;
    }
    if (tv_profile === null) {
      return Result.Ok(null);
    }
    console.log(`[${prefix}]`, "搜索到的结果为", tv_profile.name || tv_profile.original_name);
    return Result.Ok(tv_profile);
  }
  /** 使用名字在 tmdb 搜索 */
  async search_tv_in_tmdb(name: string) {
    await sleep(800);
    const r1 = await this.client.search_tv(name);
    if (r1.error) {
      return Result.Err(
        ["[ERROR]tmdbClient.search_tv failed, param is", name, ", because ", r1.error.message].join(" ")
      );
    }
    const { list } = r1.data;
    if (list.length === 0) {
      return Result.Ok(null);
    }
    const tv_item = extra_searched_tv_field(
      (() => {
        const matched = list.find((tv) => tv.name === name || tv.original_name === name);
        if (matched) {
          return matched;
        }
        return list[0];
      })()
    );
    // console.log("search_tv_in_tmdb", tv_item, list, name);
    const r = await this.get_tv_profile_with_tmdb_id({
      tmdb_id: tv_item.tmdb_id,
      original_language: tv_item.original_language,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    return Result.Ok(r.data);
  }
  /**
   * 格式化电视剧详情
   * 如下载 poster_path 等图片
   */
  async normalize_tv_profile(info: { tmdb_id: number; original_language?: string }, profile: TVProfileFromTMDB) {
    const { tmdb_id, original_language } = info;
    const { upload_image } = this.options;
    const {
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
      if (upload_image) {
        return this.upload_tmdb_images({
          tmdb_id,
          poster_path,
          backdrop_path,
        });
      }
      return Promise.resolve({
        poster_path: poster_path ?? null,
        backdrop_path: backdrop_path ?? null,
      });
    })();
    const body = {
      tmdb_id,
      name: name || null,
      original_name: original_name || null,
      overview: overview || null,
      poster_path: uploaded_poster_path || null,
      backdrop_path: uploaded_backdrop_path || null,
      first_air_date,
      original_language: original_language || null,
      popularity,
      vote_average,
      vote_count: 0,
      episode_count: number_of_episodes,
      season_count: number_of_seasons,
      status,
      in_production: Number(in_production),
      // number_of_episodes,
      // number_of_seasons,
      genres: genres
        .map((g) => {
          return g.name;
        })
        .join("|"),
      origin_country: origin_country.join("|"),
    };
    return body;
  }
  cached_tv_profile: Record<number, TVProfileRecord> = {};
  /** 获取 tv_profile，如果没有就创建 */
  async get_tv_profile_with_tmdb_id(info: { tmdb_id: number; original_language?: string }) {
    const { tmdb_id } = info;
    if (this.cached_tv_profile[tmdb_id]) {
      return Result.Ok(this.cached_tv_profile[tmdb_id]);
    }
    const existing_res = await this.store.find_tv_profile({
      tmdb_id,
    });
    if (existing_res.data) {
      this.cached_tv_profile[tmdb_id] = existing_res.data;
      return Result.Ok(existing_res.data);
    }
    const profile_res = await this.client.fetch_tv_profile(tmdb_id);
    if (profile_res.error) {
      return Result.Err(profile_res.error);
    }
    const profile = profile_res.data;
    const body = await this.normalize_tv_profile(info, profile);
    const {
      name,
      original_name,
      original_language,
      origin_country,
      overview,
      poster_path,
      backdrop_path,
      genres,
      popularity,
      vote_average,
      episode_count,
      season_count,
      status,
      in_production,
    } = body;
    const id = r_id();
    this.cached_tv_profile[tmdb_id] = {
      ...body,
      id,
      created: new Date(),
      updated: new Date(),
    };
    await this.store.prisma.tv_profile.create({
      data: {
        id,
        tmdb_id,
        name,
        original_name,
        original_language,
        overview,
        origin_country,
        poster_path,
        backdrop_path,
        genres,
        popularity,
        vote_average,
        episode_count,
        season_count,
        status,
        in_production,
      },
    });
    return Result.Ok(this.cached_tv_profile[tmdb_id]);
  }

  /** 处理所有解析到的 season */
  async process_parsed_season_list(scope: { name: string }[]) {
    // console.log("[DOMAIN]searcher/index - process_parsed_season_list", scope, this.force);
    const { user_id, drive_id } = this.options;
    let page = 1;
    let no_more = false;
    const where: NonNullable<Parameters<typeof this.store.prisma.parsed_season.findMany>[number]>["where"] = {
      season_id: null,
      parsed_tv: {
        tv_id: {
          not: null,
        },
      },
      can_search: this.force ? undefined : 1,
      user_id,
      drive_id,
    };
    if (drive_id) {
      where.drive_id = drive_id;
    }
    if (scope && scope.length && scope.length <= 10) {
      where.parsed_tv = {
        AND: [
          {
            tv_id: {
              not: null,
            },
          },
          {
            OR: scope.map((s) => {
              const { name } = s;
              return {
                name: {
                  contains: name,
                },
              };
            }),
          },
        ],
      };
    }
    // console.log("[DOMAIN]searcher/index - process_parsed_season_list where is", JSON.stringify(where, null, 2));
    const count = await this.store.prisma.parsed_season.count({ where });
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["找到", count, "个需要搜索的季"]
          .filter((t) => {
            return t !== undefined;
          })
          .map((text) => {
            return new ArticleTextNode({ text: String(text) });
          }),
      })
    );
    do {
      const parsed_season_list = await this.store.prisma.parsed_season.findMany({
        where,
        include: {
          parsed_tv: true,
        },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: {
          parsed_tv: {
            name: "desc",
          },
        },
      });
      // console.log("找到", parsed_season_list.length, "个需要处理的季", where);
      no_more = parsed_season_list.length + (page - 1) * PAGE_SIZE >= count;
      page += 1;
      for (let j = 0; j < parsed_season_list.length; j += 1) {
        const parsed_season = parsed_season_list[j];
        const { parsed_tv, season_number } = parsed_season;
        const prefix = get_prefix_from_parsed_tv(parsed_tv);
        const r = await this.search_season_profile_then_link_parsed_season({
          parsed_tv,
          parsed_season,
        });
        if (r.error) {
          this.emit(
            Events.Print,
            new ArticleLineNode({
              children: [`[${prefix}/${season_number}]`, "添加季详情失败", r.error.message].map((text) => {
                return new ArticleTextNode({ text });
              }),
            })
          );
          //   log(`[${prefix}/${season_number}]`, "添加季详情失败", r.error.message);
          continue;
        }
        // log(`[${prefix}/${season_number}]`, "添加季详情成功");
      }
    } while (no_more === false);
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["完成季搜索"].map((text) => {
          return new ArticleTextNode({ text: String(text) });
        }),
      })
    );
    return Result.Ok(null);
  }
  async search_season_profile_then_link_parsed_season(body: {
    parsed_tv: ParsedTVRecord;
    parsed_season: ParsedSeasonRecord;
  }) {
    const { parsed_tv, parsed_season } = body;
    //     const { name, original_name, correct_name } = parsed_tv;
    const { id, season_number } = parsed_season;
    const { user_id } = this.options;
    const prefix = get_prefix_from_parsed_tv(parsed_tv) + `/${season_number}`;
    const profile_res = await this.get_season_profile_with_tmdb({
      parsed_tv,
      parsed_season,
    });
    if (profile_res.error) {
      return Result.Err(profile_res.error, "10001");
    }
    if (profile_res.data === null) {
      this.store.update_parsed_season(id, {
        can_search: 0,
      });
      return Result.Err("没有搜索到季详情");
    }
    const season_res = await (async () => {
      const existing_res = await this.store.find_season({
        profile_id: profile_res.data.id,
      });
      if (existing_res.error) {
        return Result.Err(existing_res.error);
      }
      const existing = existing_res.data;
      if (existing) {
        // log(`[${prefix}]`, "已存在季详情，直接关联");
        return Result.Ok(existing);
      }
      //       log(`[${prefix}]`, "新增季详情并关联");
      const adding_res = await this.store.add_season({
        season_text: parsed_season.season_number,
        season_number: season_to_num(parsed_season.season_number),
        tv_id: parsed_tv.tv_id!,
        profile_id: profile_res.data.id,
        user_id,
      });
      if (adding_res.error) {
        return Result.Err(adding_res.error);
      }
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [`[${prefix}]`, "新增季详情成功"].map((text) => {
            return new ArticleTextNode({ text });
          }),
        })
      );
      return Result.Ok(adding_res.data);
    })();
    if (season_res.error) {
      return Result.Err(season_res.error);
    }
    const r2 = await this.store.update_parsed_season(id, {
      season_id: season_res.data.id,
      can_search: 0,
    });
    if (r2.error) {
      return Result.Err(r2.error, "10003");
    }
    return Result.Ok(r2.data);
  }
  cached_season_profiles: Record<string, SeasonProfileRecord> = {};
  async get_season_profile_with_tmdb(info: { parsed_tv: ParsedTVRecord; parsed_season: ParsedSeasonRecord }) {
    const { upload_image } = this.options;
    const { parsed_tv, parsed_season } = info;
    //     const { token, store } = this.options;
    if (parsed_tv.tv_id === null) {
      return Result.Err("电视剧缺少匹配的详情");
    }
    const tv = await this.store.prisma.tv.findUnique({
      where: {
        id: parsed_tv.tv_id,
      },
      include: {
        profile: true,
      },
    });
    if (tv === null) {
      return Result.Err("没有找到匹配的电视剧");
    }
    const { season_number } = parsed_season;
    const r = await this.client.fetch_partial_season_profile({
      tv_id: tv.profile.tmdb_id,
      season_number: season_to_num(season_number),
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    if (r.data === null) {
      return Result.Ok(null);
    }
    const tmdb_id = r.data.id;

    if (this.cached_season_profiles[tmdb_id]) {
      return Result.Ok(this.cached_season_profiles[tmdb_id]);
    }
    const existing_res = await this.store.find_season_profile({
      tmdb_id,
    });
    if (existing_res.error) {
      return Result.Err(existing_res.error);
    }
    if (existing_res.data) {
      this.cached_season_profiles[tmdb_id] = existing_res.data;
      return Result.Ok(existing_res.data);
    }
    const body = await this.normalize_season_profile(r.data, tv.profile);
    const { name, overview, poster_path, air_date, episode_count } = body;
    this.cached_season_profiles[tmdb_id] = {
      ...body,
      id: r_id(),
      created: new Date(),
      updated: new Date(),
    };
    await this.store.prisma.season_profile.create({
      data: this.cached_season_profiles[tmdb_id],
    });
    return Result.Ok(this.cached_season_profiles[tmdb_id]);
  }
  /**
   * 处理从 TMDB 搜索到的季，主要是上传图片
   */
  async normalize_season_profile(latest_season: PartialSeasonFromTMDB, tv_profile: { tmdb_id: null | number }) {
    const { upload_image } = this.options;
    const { id, name, overview, air_date, season_number, episode_count, poster_path } = latest_season;
    return {
      tmdb_id: id,
      name,
      overview,
      episode_count,
      season_number: latest_season.season_number,
      air_date,
      ...(await (async () => {
        if (upload_image) {
          const { poster_path: p } = await this.upload_tmdb_images({
            tmdb_id: `${tv_profile.tmdb_id}-${season_number}`,
            poster_path,
            backdrop_path: null,
          });
          return {
            poster_path: p ?? null,
          };
        }
        return Promise.resolve({
          poster_path,
        });
      })()),
    };
  }

  async process_parsed_episode_list(scope: { name: string }[]) {
    const { user_id, drive_id } = this.options;
    // console.log("[DOMAIN]searcher/index - process_parsed_episode_list", scope, this.force);
    let page = 1;
    let no_more = false;

    const where: NonNullable<Parameters<typeof this.store.prisma.parsed_episode.findMany>[number]>["where"] = {
      episode_id: null,
      parsed_tv: {
        tv_id: {
          not: null,
        },
      },
      parsed_season: {
        season_id: {
          not: null,
        },
      },
      can_search: this.force ? undefined : 1,
      user_id,
      drive_id,
    };
    if (drive_id) {
      where.drive_id = drive_id;
    }
    if (scope && scope.length && scope.length <= 10) {
      let queries: NonNullable<ModelWhereInput<"parsed_episode">>[] = scope.map((s) => {
        const { name } = s;
        return {
          file_name: {
            contains: name,
          },
        };
      });
      queries = queries.concat(
        scope.map((s) => {
          const { name } = s;
          return {
            parent_paths: {
              contains: name,
            },
          };
        })
      );
      where.OR = queries;
    }
    // console.log("[DOMAIN]searcher/index - process_parsed_episode_list where is", JSON.stringify(where, null, 2));
    const count = await this.store.prisma.parsed_episode.count({ where });
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["找到", count, "个需要搜索的剧集"].map((text) => {
          return new ArticleTextNode({ text: String(text) });
        }),
      })
    );
    // console.log("[DOMAIN]Searcher - process_parsed_episode_list", JSON.stringify(where), count);
    do {
      const parsed_episode_list = await this.store.prisma.parsed_episode.findMany({
        where,
        include: {
          parsed_tv: true,
          parsed_season: true,
        },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: {
          parsed_tv: {
            name: "desc",
          },
        },
      });
      // console.log("找到", parsed_episode_list.length, "个需要添加的剧集", where);
      no_more = parsed_episode_list.length + (page - 1) * PAGE_SIZE >= count;
      page += 1;
      for (let i = 0; i < parsed_episode_list.length; i += 1) {
        const parsed_episode = parsed_episode_list[i];
        const { parsed_tv, parsed_season, season_number, episode_number } = parsed_episode;
        // console.log(parsed_episode);
        const { name, original_name, correct_name } = parsed_tv;
        const prefix = correct_name || name || original_name;
        // this.emit(
        //   Events.Print,
        //   new ArticleLineNode({
        //     children: [`[${prefix}/${season_number}/${episode_number}]`, " 准备添加剧集信息"].map((text) => {
        //       return new ArticleTextNode({ text });
        //     }),
        //   })
        // );
        // console.log(`[${prefix}/${season_number}/${episode_number}]`, "准备添加剧集信息", parsed_tv);
        const r = await this.add_episode_from_parsed_episode({
          parsed_tv,
          parsed_season,
          parsed_episode,
        });
        if (r.error) {
          this.emit(
            Events.Print,
            new ArticleLineNode({
              children: [`[${prefix}/${season_number}/${episode_number}]`, "添加剧集详情失败", r.error.message].map(
                (text) => {
                  return new ArticleTextNode({ text });
                }
              ),
            })
          );
          //   log(`[${name}/${season_number}/${episode_number}]`, "添加剧集详情失败", r.error.message);
        }
        // log(`[${name}/${season_number}/${episode_number}]`, "添加剧集详情成功");
      }
    } while (no_more === false);
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["所有剧集搜索完成"].map((text) => {
          return new ArticleTextNode({ text });
        }),
      })
    );
  }

  normalize_episode_profile(
    info: {
      tmdb_id: number;
    },
    profile: Pick<EpisodeProfileFromTMDB, "id" | "name" | "overview" | "air_date" | "runtime">
  ) {
    const { tmdb_id } = info;
    const { name, overview, air_date, runtime } = profile;
    const body = {
      tmdb_id,
      name: name || null,
      overview: overview || null,
      air_date,
      runtime,
    };
    return body;
  }
  async add_episode_from_parsed_episode(body: {
    parsed_tv: ParsedTVRecord;
    parsed_season: ParsedSeasonRecord;
    parsed_episode: ParsedEpisodeRecord;
  }) {
    const { parsed_tv, parsed_season, parsed_episode } = body;
    //     const { name, original_name, correct_name } = parsed_tv;
    const { id, episode_number, season_number } = parsed_episode;
    const { user_id } = this.options;

    const prefix = get_prefix_from_parsed_tv(parsed_tv) + `/${season_number}/${episode_number}`;

    if (!parsed_tv) {
      return Result.Err("缺少关联电视剧");
    }
    if (parsed_tv.tv_id === null) {
      return Result.Err("缺少关联电视剧详情");
    }
    if (!parsed_season) {
      return Result.Err("缺少关联季");
    }
    if (parsed_season.season_id === null) {
      return Result.Err("缺少关联季详情");
    }
    const profile_res = await this.get_episode_profile_with_tmdb({
      parsed_tv,
      parsed_season,
      parsed_episode,
    });
    if (profile_res.error) {
      return Result.Err(profile_res.error, "10001");
    }
    if (profile_res.data === null) {
      this.store.update_parsed_episode(id, {
        can_search: 0,
      });
      return Result.Err("没有搜索到剧集详情");
    }
    const episode_res = await (async () => {
      const existing_res = await this.store.find_episode({
        profile_id: profile_res.data.id,
      });
      if (existing_res.error) {
        return Result.Err(existing_res.error);
      }
      if (existing_res.data) {
        // log(`[${prefix}]`, "已存在该剧集详情，直接关联");
        return Result.Ok(existing_res.data);
      }
      // log(`[${prefix}]`, "新增剧集详情并关联");
      const adding_res = await this.store.add_episode({
        episode_text: parsed_episode.episode_number,
        episode_number: episode_to_num(parsed_episode.episode_number),
        season_text: parsed_season.season_number,
        tv_id: parsed_tv.tv_id!,
        season_id: parsed_season.season_id!,
        profile_id: profile_res.data.id,
        user_id,
      });
      if (adding_res.error) {
        return Result.Err(adding_res.error);
      }
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [`[${prefix}]`, "新增剧集详情成功"].map((text) => {
            return new ArticleTextNode({ text });
          }),
        })
      );
      return Result.Ok(adding_res.data);
    })();
    if (episode_res.error) {
      return Result.Err(episode_res.error);
    }
    // await sleep(500);
    const r2 = await this.store.update_parsed_episode(parsed_episode.id, {
      episode_id: episode_res.data.id,
      can_search: 0,
    });
    if (r2.error) {
      return Result.Err(r2.error, "10003");
    }
    // this.emit(
    //   Events.Print,
    //   new ArticleLineNode({
    //     children: [`[${prefix}]`, "关联剧集详情成功"].map((text) => {
    //       return new ArticleTextNode({ text });
    //     }),
    //   })
    // );
    return Result.Ok(r2.data);
  }

  cached_episode_profiles: Record<number, EpisodeProfileRecord> = {};
  async get_episode_profile_with_tmdb(body: {
    parsed_tv: ParsedTVRecord;
    parsed_season: ParsedSeasonRecord;
    parsed_episode: ParsedEpisodeRecord;
  }) {
    const { parsed_tv, parsed_episode } = body;
    const { season_number, episode_number } = parsed_episode;
    if (parsed_tv.tv_id === null) {
      return Result.Err("电视剧缺少匹配的详情");
    }
    const tv = await this.store.prisma.tv.findUnique({
      where: {
        id: parsed_tv.tv_id,
      },
      include: {
        profile: true,
      },
    });
    if (tv === null) {
      return Result.Err("没有找到匹配的电视剧");
    }
    /**
     * 所有可能的 season_number
     * SP
     * 番外篇
     */
    const s_n = season_to_num(season_number);
    if (typeof s_n === "string") {
      return Result.Err(`季数 '${season_number}' 不合法`);
    }
    /**
     * 所有可能的 episode_number
     * 花絮1
     * 彩蛋1
     * 番外1
     * CM01
     * NC01
     * 预告01
     * PR01
     * E01-02
     * E01-E02
     */
    const e_n = episode_to_num(episode_number);
    if (typeof e_n === "string") {
      return Result.Err(`集数 '${episode_number}' 不合法`);
    }
    const r = await this.client.fetch_episode_profile({
      tv_id: tv.profile.tmdb_id,
      season_number: s_n,
      episode_number: e_n,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    if (r.data === null) {
      return Result.Ok(null);
    }
    const tmdb_id = r.data.id;
    if (this.cached_episode_profiles[tmdb_id]) {
      return Result.Ok(this.cached_episode_profiles[tmdb_id]);
    }
    const existing_res = await this.store.find_episode_profile({
      tmdb_id,
    });
    if (existing_res.error) {
      return Result.Err(existing_res.error);
    }
    if (existing_res.data) {
      this.cached_episode_profiles[tmdb_id] = existing_res.data;
      return Result.Ok(existing_res.data);
    }
    const { id, name, overview, air_date } = r.data;
    const payload = this.normalize_episode_profile({ tmdb_id }, r.data);
    this.cached_episode_profiles[tmdb_id] = {
      ...payload,
      id: r_id(),
      created: new Date(),
      updated: new Date(),
    };
    await this.store.prisma.episode_profile.create({
      data: this.cached_episode_profiles[tmdb_id],
    });
    return Result.Ok(this.cached_episode_profiles[tmdb_id]);
  }

  async process_parsed_movie_list(scope: { name: string }[]) {
    // console.log("[DOMAIN]searcher/index - process_parsed_movie_list", scope, this.force);
    const { user_id, drive_id } = this.options;
    let page = 1;
    let no_more = false;

    const where: NonNullable<Parameters<typeof this.store.prisma.parsed_movie.findMany>[number]>["where"] = {
      movie_id: null,
      can_search: this.force ? undefined : 1,
      user_id,
      drive_id,
    };
    if (drive_id) {
      where.drive_id = drive_id;
    }
    if (scope && scope.length && scope.length <= 10) {
      where.OR = scope.map((s) => {
        const { name } = s;
        return {
          file_name: {
            contains: name,
          },
        };
      });
    }
    // console.log("[DOMAIN]searcher/index - process_parsed_movie_list where is", JSON.stringify(where, null, 2));
    const count = await this.store.prisma.parsed_movie.count({ where });
    // console.log('[DOMAIN]Searcher - process_parsed_movie_list');
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["找到", count, "个需要搜索的电影"].map((text) => {
          return new ArticleTextNode({ text: String(text) });
        }),
      })
    );
    do {
      const parsed_movie_list = await this.store.prisma.parsed_movie.findMany({
        where,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      });
      // console.log("找到", parsed_episode_list.length, "个需要添加的剧集", where);
      no_more = parsed_movie_list.length + (page - 1) * PAGE_SIZE >= count;
      page += 1;
      for (let i = 0; i < parsed_movie_list.length; i += 1) {
        const parsed_movie = parsed_movie_list[i];
        const { name, original_name, correct_name, parent_paths, file_name } = parsed_movie;
        const prefix = correct_name || name || original_name;
        if (prefix === null) {
          this.emit(
            Events.Print,
            new ArticleLineNode({
              children: [`${parent_paths}/${file_name}`, "没有解析出名称"].map((text) => {
                return new ArticleTextNode({ text });
              }),
            })
          );
          continue;
        }
        const r = await this.add_movie_from_parsed_movie({
          parsed_movie,
        });
        if (r.error) {
          this.emit(
            Events.Print,
            new ArticleLineNode({
              children: [`[${prefix}]`, "添加电影详情失败", r.error.message].map((text) => {
                return new ArticleTextNode({ text });
              }),
            })
          );
          //   log(`[${name}/${season_number}/${episode_number}]`, "添加剧集详情失败", r.error.message);
        }
        // log(`[${name}/${season_number}/${episode_number}]`, "添加剧集详情成功");
      }
    } while (no_more === false);
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["所有电影搜索完成"].map((text) => {
          return new ArticleTextNode({ text });
        }),
      })
    );
  }
  /** 根据 parsed_movie 搜索电视剧详情 */
  async get_movie_profile(movie: ParsedMovieRecord) {
    const { name, original_name, correct_name } = movie;
    // log("[](search_tv_in_tmdb)start search", tv.name || tv.original_name);
    let movie_profile = null;
    if (correct_name) {
      //       log(`[${prefix}]`, "使用", correct_name, "搜索");
      const r = await this.search_movie_in_tmdb(correct_name);
      if (r.error) {
        return Result.Err(r.error);
      }
      movie_profile = r.data;
    }
    if (movie_profile === null && name) {
      //       log(`[${prefix}]`, "使用", name, "搜索");
      const r = await this.search_movie_in_tmdb(name);
      if (r.error) {
        return Result.Err(r.error);
      }
      movie_profile = r.data;
    }
    if (movie_profile === null && original_name) {
      //       log(`[${prefix}]`, "使用", original_name, "搜索");
      const processed_original_name = original_name.split(".").join(" ");
      const r = await this.search_movie_in_tmdb(processed_original_name);
      if (r.error) {
        return Result.Err(r.error);
      }
      movie_profile = r.data;
    }
    if (movie_profile === null) {
      return Result.Ok(null);
    }
    //     log(`[${prefix}]`, "使用", original_name, "搜索到的结果为", tv_profile.name || tv_profile.original_name);
    return Result.Ok(movie_profile);
  }
  /** 新增电影和电影详情 */
  async add_movie_from_parsed_movie(body: { parsed_movie: ParsedMovieRecord }) {
    const { parsed_movie } = body;
    const { id, name, original_name, correct_name } = parsed_movie;
    const { user_id } = this.options;
    const prefix = `${correct_name || name || original_name}`;
    const profile_res = await this.get_movie_profile(parsed_movie);
    if (profile_res.error) {
      return Result.Err(profile_res.error, "10001");
    }
    if (profile_res.data === null) {
      this.store.update_parsed_episode(id, {
        can_search: 0,
      });
      return Result.Err("没有搜索到电影详情");
    }
    const r = await this.link_movie_profile({
      parsed_movie,
      profile: profile_res.data,
    });
    return r;
  }
  async link_movie_profile(body: { parsed_movie: ParsedMovieRecord; profile: MovieProfileRecord }) {
    const { user_id } = this.options;
    const { parsed_movie, profile } = body;
    const { id, name, original_name, correct_name } = parsed_movie;
    const prefix = `${correct_name || name || original_name}`;
    const movie_res = await (async () => {
      const existing_res = await this.store.find_movie({
        profile_id: profile.id,
      });
      if (existing_res.error) {
        return Result.Err(existing_res.error);
      }
      if (existing_res.data) {
        return Result.Ok(existing_res.data);
      }
      const adding_res = await this.store.add_movie({
        profile_id: profile.id,
        user_id,
      });
      if (adding_res.error) {
        return Result.Err(adding_res.error);
      }
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [`[${prefix}]`, "新增电影详情成功"].map((text) => {
            return new ArticleTextNode({ text });
          }),
        })
      );
      return Result.Ok(adding_res.data);
    })();
    if (movie_res.error) {
      return Result.Err(movie_res.error);
    }
    const r2 = await this.store.update_parsed_movie(parsed_movie.id, {
      movie_id: movie_res.data.id,
      can_search: 0,
    });
    if (r2.error) {
      return Result.Err(r2.error, "10003");
    }
    return Result.Ok(r2.data);
  }
  /** 使用名字在 tmdb 搜索电影，并返回 movie_profile 记录 */
  async search_movie_in_tmdb(name: string) {
    const r1 = await this.client.search_movie(name);
    if (r1.error) {
      return Result.Err(
        ["[ERROR]tmdbClient.search_tv failed, param is", name, ", because ", r1.error.message].join(" ")
      );
    }
    const { list } = r1.data;
    if (list.length === 0) {
      return Result.Ok(null);
    }
    const matched = (() => {
      const a = list.find((movie) => movie.name === name);
      if (!a) {
        return list[0];
      }
      return a;
    })();
    const movie_item = matched;
    const r = await this.get_movie_profile_with_tmdb_id({
      tmdb_id: movie_item.id,
      original_language: movie_item.original_language,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    return Result.Ok(r.data);
  }
  async normalize_movie_profile(
    info: {
      tmdb_id: number;
      original_language?: string;
    },
    profile: MovieProfileFromTMDB
  ) {
    const { upload_image } = this.options;
    const { tmdb_id, original_language } = info;
    const {
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
          tmdb_id,
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
      tmdb_id,
      name: name || null,
      original_name: original_name || null,
      overview: overview || null,
      poster_path: uploaded_poster_path || null,
      backdrop_path: uploaded_backdrop_path || null,
      original_language: original_language || null,
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
  cached_movie_profiles: Record<number, MovieProfileRecord> = {};
  async get_movie_profile_with_tmdb_id(info: { tmdb_id: number; original_language?: string }) {
    const { tmdb_id, original_language } = info;
    const { upload_image } = this.options;

    if (this.cached_movie_profiles[tmdb_id]) {
      return Result.Ok(this.cached_movie_profiles[tmdb_id]);
    }
    const existing_res = await this.store.find_movie_profile({
      tmdb_id,
    });
    if (existing_res.data) {
      this.cached_movie_profiles[tmdb_id] = existing_res.data;
      return Result.Ok(existing_res.data);
    }
    const profile_res = await this.client.fetch_movie_profile(tmdb_id);
    if (profile_res.error) {
      return Result.Err(profile_res.error);
    }
    const profile = profile_res.data;
    const body = await this.normalize_movie_profile(info, profile);
    const {
      name,
      original_name,
      overview,
      poster_path,
      backdrop_path,
      air_date,
      popularity,
      vote_average,
      origin_country,
      genres,
    } = body;
    this.cached_movie_profiles[tmdb_id] = {
      ...body,
      id: r_id(),
      created: new Date(),
      updated: new Date(),
    };
    await this.store.prisma.movie_profile.create({
      data: this.cached_movie_profiles[tmdb_id],
    });
    return Result.Ok(this.cached_movie_profiles[tmdb_id]);
  }

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
      const r = await this.upload.download(backdrop_path, key);
      if (r.error) {
        // console.log("download image failed 2", r.error.message);
      }
      if (r.data) {
        result.backdrop_path = r.data;
      }
    }
    // console.log("check need upload images result", result);
    return result;
  }

  stop() {
    this._stop = true;
  }

  on_print(handler: Handler<TheTypesOfEvents[Events.Print]>) {
    return this.on(Events.Print, handler);
  }
  on_finish(handler: Handler<TheTypesOfEvents[Events.Finish]>) {
    return this.on(Events.Finish, handler);
  }
  on_error(handler: Handler<TheTypesOfEvents[Events.Error]>) {
    return this.on(Events.Error, handler);
  }
}

function get_prefix_from_parsed_tv(parsed_tv: ParsedTVRecord) {
  const { name, original_name, correct_name } = parsed_tv;
  const prefix = `${correct_name || name || original_name}`;
  return prefix;
}

function split_array_into_chunks<T extends Record<any, any>>(array: T[], n = 20) {
  const result = [];
  for (let i = 0; i < array.length; i += n) {
    result.push(array.slice(i, i + n));
  }
  return result;
}
