/**
 * @file 解析出的影视剧搜索
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
import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
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
  TVRecord,
  EpisodeRecord,
  SeasonRecord,
  MovieRecord,
} from "@/domains/store/types";
import { Result } from "@/types";
import { episode_to_num, r_id, season_to_num, sleep } from "@/utils";

import { extra_searched_tv_field } from "./utils";
import { MediaProfileSourceTypes } from "@/constants";

enum Events {
  TVAdded,
  SeasonAdded,
  EpisodeAdded,
  MovieAdded,
  Print,
  Finish,
  Error,
}
type TheTypesOfEvents = {
  [Events.TVAdded]: TVRecord;
  [Events.SeasonAdded]: SeasonRecord;
  [Events.EpisodeAdded]: EpisodeRecord;
  [Events.MovieAdded]: MovieRecord;
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
  drive?: Drive;
  /** 仅处理该用户的所有未匹配电视剧 */
  user?: User;
  /** 强制索引全部，忽略 can_search 为 0 */
  force?: boolean;
  assets: string;
  /** TMDB token */
  tmdb_token: string;
  on_season_added?: (season: SeasonRecord) => void;
  on_episode_added?: (episode: EpisodeRecord) => void;
  on_movie_added?: (movie: MovieRecord) => void;
  on_print?: (v: ArticleLineNode | ArticleSectionNode) => void;
  on_finish?: () => void;
  on_error?: (v: Error) => void;
};

const PAGE_SIZE = 20;
export class MediaSearcher extends BaseDomain<TheTypesOfEvents> {
  static New(body: Partial<MediaSearcherProps>) {
    const {
      user,
      drive,
      tmdb_token,
      assets,
      force,
      store,
      on_season_added,
      on_episode_added,
      on_movie_added,
      on_print,
      on_finish,
      on_error,
    } = body;
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
      user,
      drive,
      force,
      tmdb_token,
      assets,
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
  client: TMDBClient;
  upload: ImageUploader;
  options: Partial<{
    drive_id?: string;
    user_id?: string;
    upload_image?: boolean;
    /** 忽略 can_search，强制重新搜索 */
    force?: boolean;
  }> = {};
  /** 是否暂停本次搜索 */
  _stop: boolean = false;

  constructor(options: MediaSearcherProps) {
    super();

    const {
      upload_image = true,
      user,
      drive,
      force = false,
      assets,
      tmdb_token,
      store,
      on_season_added,
      on_episode_added,
      on_movie_added,
      on_print,
      on_finish,
      on_error,
    } = options;
    this.store = store;
    this.client = new TMDBClient({ token: tmdb_token });
    this.upload = new ImageUploader({ root: assets });
    this.options = {
      user_id: user?.id,
      drive_id: drive?.id,
      upload_image,
      force,
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
  async run(scope: { name: string }[] = []) {
    // console.log("[DOMAIN]MediaSearcher - run", scope);
    if (scope.length !== 0) {
      const files = uniqueBy((obj) => obj.name, scope);
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: ["限定搜索范围", files.length, "个关键字"].map((text) => {
            return new ArticleTextNode({ text: String(text) });
          }),
        })
      );
      const file_groups = split_array_into_chunks(
        files.filter((f) => {
          return !!f.name;
        }),
        10
      );
      for (let i = 0; i < file_groups.length; i += 1) {
        await this.process_parsed_tv_list(file_groups[i]);
      }
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: ["所有电视剧搜索完成"].map((text) => {
            return new ArticleTextNode({ text });
          }),
        })
      );
      for (let i = 0; i < file_groups.length; i += 1) {
        await this.process_parsed_season_list(file_groups[i]);
      }
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: ["所有季搜索完成"].map((text) => {
            return new ArticleTextNode({ text: String(text) });
          }),
        })
      );
      for (let i = 0; i < file_groups.length; i += 1) {
        await this.process_parsed_episode_list(file_groups[i]);
      }
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: ["所有剧集搜索完成"].map((text) => {
            return new ArticleTextNode({ text });
          }),
        })
      );
      for (let i = 0; i < file_groups.length; i += 1) {
        await this.process_parsed_movie_list(file_groups[i]);
      }
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: ["所有电影搜索完成"].map((text) => {
            return new ArticleTextNode({ text });
          }),
        })
      );
      this.emit(Events.Finish);
      return Result.Ok(null);
    }
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["搜索全部未索引内容"].map((text) => {
          return new ArticleTextNode({ text: String(text) });
        }),
      })
    );
    await this.process_parsed_tv_list();
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["所有电视剧搜索完成"].map((text) => {
          return new ArticleTextNode({ text });
        }),
      })
    );
    await this.process_parsed_season_list();
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["所有季搜索完成"].map((text) => {
          return new ArticleTextNode({ text: String(text) });
        }),
      })
    );
    await this.process_parsed_episode_list();
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["所有剧集搜索完成"].map((text) => {
          return new ArticleTextNode({ text });
        }),
      })
    );
    await this.process_parsed_movie_list();
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["所有电影搜索完成"].map((text) => {
          return new ArticleTextNode({ text });
        }),
      })
    );
    this.emit(Events.Finish);
    return Result.Ok(null);
  }
  /**
   * 处理所有没有匹配好电视剧详情的电视剧
   */
  async process_parsed_tv_list(scope?: { name: string }[]) {
    // console.log("[DOMAIN]searcher/index - process_parsed_tv_list", scope, this.force);
    const { user_id, drive_id, force } = this.options;
    // let page = 1;
    let next_marker: string | null = null;
    let no_more = false;

    const where: ModelQuery<typeof this.store.prisma.parsed_tv.findMany>["where"] = {
      tv_id: null,
      can_search: force ? undefined : 1,
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
    const count = await this.store.prisma.parsed_tv.count({
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
      const list = await this.store.prisma.parsed_tv.findMany({
        where,
        include: {
          parsed_seasons: true,
          parsed_episodes: true,
        },
        take: PAGE_SIZE + 1,
        orderBy: {
          name: "desc",
        },
        ...(() => {
          const cursor: { id?: string } = {};
          if (next_marker) {
            cursor.id = next_marker;
            return {
              cursor,
            };
          }
          return {} as ModelQuery<typeof this.store.prisma.parsed_tv.findMany>["cursor"];
        })(),
      });
      no_more = list.length < PAGE_SIZE + 1;
      next_marker = null;
      if (list.length === PAGE_SIZE + 1) {
        const last_record = list[list.length - 1];
        next_marker = last_record.id;
      }
      const correct_list = list.slice(0, PAGE_SIZE);
      for (let i = 0; i < correct_list.length; i += 1) {
        const parsed_tv = correct_list[i];
        const prefix = get_prefix_from_parsed_tv(parsed_tv);
        // if (on_stop) {
        //   const r = await on_stop();
        //   if (r.data) {
        //     return;
        //   }
        // }
        this.emit(
          Events.Print,
          new ArticleLineNode({
            children: [`[${prefix}]`, " 准备添加电视剧信息"].map((text) => {
              return new ArticleTextNode({ text });
            }),
          })
        );
        const r = await this.process_parsed_tv({ parsed_tv });
        if (r.error) {
          this.emit(
            Events.Print,
            new ArticleLineNode({
              children: [`[${prefix}]`, "添加电视剧详情失败", "  ", r.error.message].map((text) => {
                return new ArticleTextNode({ text });
              }),
            })
          );
          continue;
        }
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
  /**
   * 根据解析的电视剧信息，搜索 TMDB 是否有对应的电视剧详情
   * 如果没有详情，跳过
   * 如果有详情，查询数据库是否已存在该详情，如果已存在，直接关联已存在的详情；否则创建详情记录，并关联
   */
  async process_parsed_tv(body: { parsed_tv: ParsedTVRecord }) {
    const { parsed_tv } = body;
    const { id } = parsed_tv;
    const profile_res = await this.search_tv_profile_with_parsed_tv(parsed_tv);
    if (profile_res.error) {
      return Result.Err(profile_res.error);
    }
    if (profile_res.data === null) {
      this.store.update_parsed_tv(id, {
        can_search: 0,
      });
      return Result.Err("没有搜索到电视剧详情");
    }
    const profile = profile_res.data;
    return this.link_tv_profile_to_parsed_tv({
      parsed_tv,
      profile,
    });
  }
  /**
   * 将一条 tv 记录关联到 parsed_tv 记录，如果没有 tv 记录，就创建再关联
   */
  async link_tv_profile_to_parsed_tv(body: { parsed_tv: ParsedTVRecord; profile: TVProfileRecord }) {
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
        return Result.Ok(existing_res.data);
      }
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
          children: [`[${prefix}]`, "新增电视剧详情成功，匹配的电视剧是", ` [${profile.name}]`].map((text) => {
            return new ArticleTextNode({ text });
          }),
        })
      );
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [`[${prefix}]`, JSON.stringify(profile)].map((text) => {
            return new ArticleTextNode({ text });
          }),
        })
      );
      this.emit(Events.TVAdded, adding_res.data);
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
  /**
   * 根据 parsed_tv 搜索电视剧详情
   * 返回从三方平台搜索到的详情信息
   */
  async search_tv_profile_with_parsed_tv(parsed_tv: ParsedTVRecord) {
    const { name, original_name, correct_name } = parsed_tv;
    const prefix = [correct_name, name, original_name].filter(Boolean).join("/");
    // log("[](search_tv_in_tmdb)start search", tv.name || tv.original_name);
    const tv_profile_in_tmdb_res = await (async () => {
      if (correct_name) {
        // console.log(`[${prefix}]`, "使用", correct_name, "搜索");
        const r = await this.search_tv_in_tmdb(correct_name);
        if (r.error) {
          return Result.Err(r.error);
        }
        return Result.Ok(r.data);
      }
      if (name) {
        // console.log(`[${prefix}]`, "使用", name, "搜索");
        const r = await this.search_tv_in_tmdb(name);
        if (r.error) {
          return Result.Err(r.error);
        }
        return Result.Ok(r.data);
      }
      if (original_name) {
        // console.log(`[${prefix}]`, "使用", original_name, "搜索");
        const processed_original_name = original_name.split(".").join(" ");
        const r = await this.search_tv_in_tmdb(processed_original_name);
        if (r.error) {
          return Result.Err(r.error);
        }
        return Result.Ok(r.data);
      }
      return Result.Ok(null);
    })();
    if (tv_profile_in_tmdb_res.error) {
      return Result.Err(tv_profile_in_tmdb_res.error);
    }
    let tv_profile_in_tmdb = tv_profile_in_tmdb_res.data;
    if (tv_profile_in_tmdb === null) {
      return Result.Ok(null);
    }
    console.log(`[${prefix}]`, "搜索到的电视剧为", tv_profile_in_tmdb.name || tv_profile_in_tmdb.original_name);
    return Result.Ok(tv_profile_in_tmdb);
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
      if (upload_image) {
        return this.upload_tmdb_images({
          tmdb_id: id,
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
  cached_tv_profile: Record<string, TVProfileRecord> = {};
  /**
   * 获取 tv_profile，如果没有就创建
   */
  async get_tv_profile_with_tmdb_id(info: { tmdb_id: number }) {
    const { tmdb_id } = info;
    const unique_id = String(tmdb_id);
    if (this.cached_tv_profile[unique_id]) {
      return Result.Ok(this.cached_tv_profile[unique_id]);
    }
    const existing_res = await this.store.find_tv_profile({
      unique_id,
    });
    if (existing_res.data) {
      this.cached_tv_profile[unique_id] = existing_res.data;
      return Result.Ok(existing_res.data);
    }
    const profile_res = await this.client.fetch_tv_profile(tmdb_id);
    if (profile_res.error) {
      return Result.Err(profile_res.error);
    }
    const profile = profile_res.data;
    const body = await this.normalize_tv_profile(profile);
    const id = r_id();
    this.cached_tv_profile[unique_id] = {
      ...body,
      id,
      created: new Date(),
      updated: new Date(),
      unique_id,
      source: 1,
      sources: JSON.stringify({ tmdb_id }),
    };
    await this.store.prisma.tv_profile.create({
      data: this.cached_tv_profile[unique_id],
    });
    return Result.Ok(this.cached_tv_profile[unique_id]);
  }

  /**
   * 处理所有解析到的 season
   */
  async process_parsed_season_list(scope?: { name: string }[]) {
    // console.log("[DOMAIN]searcher/index - process_parsed_season_list", scope, this.force);
    const { user_id, drive_id, force } = this.options;
    // let page = 1;
    let next_marker: string | null = null;
    let no_more = false;
    const where: ModelQuery<typeof this.store.prisma.parsed_season.findMany>["where"] = {
      season_id: null,
      can_search: force ? undefined : 1,
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
      const list = await this.store.prisma.parsed_season.findMany({
        where,
        include: {
          parsed_tv: true,
        },
        take: PAGE_SIZE + 1,
        orderBy: {
          parsed_tv: {
            name: "desc",
          },
        },
        ...(() => {
          const cursor: { id?: string } = {};
          if (next_marker) {
            cursor.id = next_marker;
            return {
              cursor,
            };
          }
          return {} as ModelQuery<typeof this.store.prisma.parsed_season.findMany>["cursor"];
        })(),
      });
      // console.log("找到", parsed_season_list.length, "个需要处理的季", where);
      no_more = list.length < PAGE_SIZE + 1;
      next_marker = null;
      if (list.length === PAGE_SIZE + 1) {
        const last_record = list[list.length - 1];
        next_marker = last_record.id;
      }
      const correct_list = list.slice(0, PAGE_SIZE);
      for (let i = 0; i < correct_list.length; i += 1) {
        const parsed_season = correct_list[i];
        const { parsed_tv, season_number } = parsed_season;
        const prefix = get_prefix_from_parsed_tv(parsed_tv);
        this.emit(
          Events.Print,
          new ArticleLineNode({
            children: [`[${prefix}/${season_number}]`, " 准备添加季信息"].map((text) => {
              return new ArticleTextNode({ text });
            }),
          })
        );
        const r = await this.process_parsed_season({
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
          continue;
        }
      }
    } while (no_more === false);
    return Result.Ok(null);
  }
  /**
   * 处理解析出的 季 结果
   */
  async process_parsed_season(body: { parsed_tv: ParsedTVRecord; parsed_season: ParsedSeasonRecord }) {
    const { parsed_tv, parsed_season } = body;
    const { id } = parsed_season;
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
    const profile = profile_res.data;
    return this.link_season_profile_to_parsed_season({ parsed_season, parsed_tv, profile });
  }
  /**
   * 将从三方获取到的详情，和解析到的 season 做关联
   * 先根据三方详情创建 season，如果已存在就不创建，关联已存在的 season 和 parsed_season。否则直接关联 season 和 parsed_season
   */
  async link_season_profile_to_parsed_season(body: {
    profile: SeasonProfileRecord;
    parsed_tv: ParsedTVRecord;
    parsed_season: ParsedSeasonRecord;
  }) {
    const { user_id } = this.options;
    const { profile, parsed_tv, parsed_season } = body;
    const { season_number } = parsed_season;
    const prefix = get_prefix_from_parsed_tv(parsed_tv) + `/${season_number}`;
    const season_res = await (async () => {
      const existing_res = await this.store.find_season({
        profile_id: profile.id,
        user_id,
      });
      if (existing_res.error) {
        return Result.Err(existing_res.error);
      }
      if (existing_res.data) {
        return Result.Ok(existing_res.data);
      }
      const adding_res = await this.store.add_season({
        season_text: parsed_season.season_number,
        season_number: (() => {
          const r = season_to_num(parsed_season.season_number);
          if (typeof r === "string") {
            return 0;
          }
          return r;
        })(),
        tv_id: parsed_tv.tv_id!,
        profile_id: profile.id,
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
      this.emit(Events.SeasonAdded, adding_res.data);
      return Result.Ok(adding_res.data);
    })();
    if (season_res.error) {
      return Result.Err(season_res.error);
    }
    const r2 = await this.store.update_parsed_season(parsed_season.id, {
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
    const { parsed_tv, parsed_season } = info;
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
      return Result.Err("没有匹配的电视剧");
    }
    const { season_number } = parsed_season;
    const s_n = season_to_num(season_number);
    if (typeof s_n === "number") {
      const r = await this.client.fetch_partial_season_profile({
        tv_id: Number(tv.profile.unique_id),
        season_number: s_n,
      });
      if (r.error) {
        return Result.Err(r.error);
      }
      if (r.data === null) {
        return Result.Ok(null);
      }
      const season_profile = r.data;
      const tmdb_id = season_profile.id;
      const unique_id = String(tmdb_id);
      if (this.cached_season_profiles[unique_id]) {
        return Result.Ok(this.cached_season_profiles[unique_id]);
      }
      const existing_res = await this.store.find_season_profile({
        unique_id,
      });
      if (existing_res.error) {
        return Result.Err(existing_res.error);
      }
      if (existing_res.data) {
        this.cached_season_profiles[unique_id] = existing_res.data;
        return Result.Ok(existing_res.data);
      }
      const body = await this.normalize_season_profile(season_profile);
      this.cached_season_profiles[unique_id] = {
        ...body,
        id: r_id(),
        created: new Date(),
        updated: new Date(),
        unique_id: String(tmdb_id),
        source: 1,
        sources: JSON.stringify({ tmdb_id }),
      };
      await this.store.prisma.season_profile.create({
        data: this.cached_season_profiles[unique_id],
      });
      return Result.Ok(this.cached_season_profiles[unique_id]);
    }
    if (s_n === "其他") {
      const unique_id = [tv.profile.id, s_n].join("/");
      if (this.cached_season_profiles[unique_id]) {
        return Result.Ok(this.cached_season_profiles[unique_id]);
      }
      const existing_res = await this.store.find_season_profile({
        unique_id,
      });
      if (existing_res.error) {
        return Result.Err(existing_res.error);
      }
      if (existing_res.data) {
        this.cached_season_profiles[unique_id] = existing_res.data;
        return Result.Ok(existing_res.data);
      }
      const body = {
        unique_id,
        source: MediaProfileSourceTypes.Other,
        sources: "",
        name: s_n,
        overview: null,
        poster_path: null,
        season_number: 9999,
        air_date: null,
        episode_count: 0,
      };
      this.cached_season_profiles[unique_id] = {
        ...body,
        id: r_id(),
        created: new Date(),
        updated: new Date(),
      };
      await this.store.prisma.season_profile.create({
        data: this.cached_season_profiles[unique_id],
      });
      return Result.Ok(this.cached_season_profiles[unique_id]);
    }
    return Result.Err("季信息异常，无法识别");
  }
  /**
   * 处理从 TMDB 搜索到的季，主要是上传图片
   */
  async normalize_season_profile(latest_season: PartialSeasonFromTMDB) {
    const { upload_image } = this.options;
    const { id, name, overview, air_date, season_number, episode_count, poster_path } = latest_season;
    return {
      unique_id: String(id),
      name,
      overview,
      episode_count,
      season_number: latest_season.season_number,
      air_date,
      ...(await (async () => {
        if (upload_image) {
          const { poster_path: p } = await this.upload_tmdb_images({
            tmdb_id: `${id}-${season_number}`,
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

  async process_parsed_episode_list(scope?: { name: string }[]) {
    const { user_id, drive_id, force } = this.options;
    // console.log("[DOMAIN]searcher/index - process_parsed_episode_list", scope, this.force);

    // let page = 1;
    let next_marker: null | string = null;
    let no_more = false;

    const where: ModelQuery<typeof this.store.prisma.parsed_episode.findMany>["where"] = {
      episode_id: null,
      can_search: force ? undefined : 1,
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
      const list = await this.store.prisma.parsed_episode.findMany({
        where,
        include: {
          parsed_tv: true,
          parsed_season: true,
        },
        take: PAGE_SIZE + 1,
        orderBy: {
          parsed_tv: {
            name: "desc",
          },
        },
        ...(() => {
          const cursor: { id?: string } = {};
          if (next_marker) {
            cursor.id = next_marker;
            return {
              cursor,
            };
          }
          return {} as ModelQuery<typeof this.store.prisma.parsed_episode.findMany>["cursor"];
        })(),
      });
      // console.log("找到", parsed_episode_list.length, "个需要添加的剧集", where);
      no_more = list.length < PAGE_SIZE + 1;
      next_marker = null;
      if (list.length === PAGE_SIZE + 1) {
        const last_record = list[list.length - 1];
        next_marker = last_record.id;
      }
      const correct_list = list.slice(0, PAGE_SIZE);
      for (let i = 0; i < correct_list.length; i += 1) {
        const parsed_episode = correct_list[i];
        const { parsed_tv, parsed_season, season_number, episode_number } = parsed_episode;
        // console.log(parsed_episode);
        const { name, original_name, correct_name } = parsed_tv;
        const prefix = correct_name || name || original_name;
        this.emit(
          Events.Print,
          new ArticleLineNode({
            children: [`[${prefix}/${season_number}/${episode_number}]`, " 准备添加剧集信息"].map((text) => {
              return new ArticleTextNode({ text });
            }),
          })
        );
        // console.log(`[${prefix}/${season_number}/${episode_number}]`, "准备添加剧集信息");
        const r = await this.process_parsed_episode({
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
        }
      }
    } while (no_more === false);
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
  async process_parsed_episode(body: {
    parsed_tv: ParsedTVRecord;
    parsed_season: ParsedSeasonRecord;
    parsed_episode: ParsedEpisodeRecord;
  }) {
    const { parsed_tv, parsed_season, parsed_episode } = body;
    const { id } = parsed_episode;
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
    return this.link_episode_profile_to_parsed_episode({
      profile: profile_res.data,
      parsed_tv,
      parsed_season,
      parsed_episode,
    });
  }
  async link_episode_profile_to_parsed_episode(body: {
    profile: EpisodeProfileRecord;
    parsed_tv: ParsedTVRecord;
    parsed_season: ParsedSeasonRecord;
    parsed_episode: ParsedEpisodeRecord;
  }) {
    const { user_id } = this.options;
    const { profile, parsed_tv, parsed_season, parsed_episode } = body;
    const { season_number, episode_number } = parsed_episode;
    const prefix = get_prefix_from_parsed_tv(parsed_tv) + `/${season_number}/${episode_number}`;
    const episode_res = await (async () => {
      const existing_res = await this.store.find_episode({
        profile_id: profile.id,
      });
      if (existing_res.error) {
        return Result.Err(existing_res.error);
      }
      if (existing_res.data) {
        return Result.Ok(existing_res.data);
      }
      const adding_res = await this.store.add_episode({
        episode_text: parsed_episode.episode_number,
        episode_number: (() => {
          const r = episode_to_num(parsed_episode.episode_number);
          if (typeof r === "string") {
            return 0;
          }
          return r;
        })(),
        season_text: parsed_season.season_number,
        tv_id: parsed_tv.tv_id!,
        season_id: parsed_season.season_id!,
        profile_id: profile.id,
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
      this.emit(Events.EpisodeAdded, adding_res.data);
      return Result.Ok(adding_res.data);
    })();
    if (episode_res.error) {
      return Result.Err(episode_res.error);
    }
    const r2 = await this.store.update_parsed_episode(parsed_episode.id, {
      episode_id: episode_res.data.id,
      can_search: 0,
    });
    if (r2.error) {
      return Result.Err(r2.error, "10003");
    }
    return Result.Ok(r2.data);
  }
  cached_episode_profiles: Record<string, EpisodeProfileRecord> = {};
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
    const same_episode = await this.store.prisma.episode.findFirst({
      where: {
        season_text: season_number,
        episode_text: episode_number,
        tv_id: tv.id,
      },
      include: {
        profile: true,
      },
    });
    // console.log("[DOMAIN]Search search same episode by season_text", same_episode);
    // @todo 还可以缓存优化
    if (same_episode) {
      return Result.Ok(same_episode.profile);
    }
    const s_n = season_to_num(season_number);
    const e_n = episode_to_num(episode_number);
    if (typeof s_n === "number" && typeof e_n === "number") {
      /** 在 TMDB 上搜索剧集详情并新增到本地数据库 */
      const r = await this.client.fetch_episode_profile({
        tv_id: Number(tv.profile.unique_id),
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
      const unique_id = String(tmdb_id);
      if (this.cached_episode_profiles[unique_id]) {
        return Result.Ok(this.cached_episode_profiles[unique_id]);
      }
      const existing_res = await this.store.find_episode_profile({
        unique_id,
      });
      if (existing_res.error) {
        return Result.Err(existing_res.error);
      }
      if (existing_res.data) {
        this.cached_episode_profiles[unique_id] = existing_res.data;
        return Result.Ok(existing_res.data);
      }
      const payload = this.normalize_episode_profile(r.data);
      this.cached_episode_profiles[unique_id] = {
        ...payload,
        id: r_id(),
        created: new Date(),
        updated: new Date(),
        source: 1,
        sources: JSON.stringify({ tmdb_id }),
      };
      await this.store.prisma.episode_profile.create({
        data: this.cached_episode_profiles[unique_id],
      });
      return Result.Ok(this.cached_episode_profiles[unique_id]);
    }
    if (season_number === "其他") {
      const unique_id = [parsed_tv.tv_id, season_number, e_n].join("/");
      if (this.cached_episode_profiles[unique_id]) {
        return Result.Ok(this.cached_episode_profiles[unique_id]);
      }
      const existing_res = await this.store.find_episode_profile({
        unique_id,
      });
      if (existing_res.error) {
        return Result.Err(existing_res.error);
      }
      if (existing_res.data) {
        this.cached_episode_profiles[unique_id] = existing_res.data;
        return Result.Ok(existing_res.data);
      }
      const payload = {
        unique_id,
        source: MediaProfileSourceTypes.Other,
        sources: null,
        name: episode_number,
        overview: null,
        air_date: null,
        runtime: 0,
        episode_number: 0,
        season_number: 9999,
      };
      this.cached_episode_profiles[unique_id] = {
        ...payload,
        id: r_id(),
        created: new Date(),
        updated: new Date(),
      };
      await this.store.prisma.episode_profile.create({
        data: this.cached_episode_profiles[unique_id],
      });
      return Result.Ok(this.cached_episode_profiles[unique_id]);
    }
    /**
     * 所有可能的 season_number
     * SP
     * 番外篇
     */
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
    if (typeof e_n === "string") {
      return Result.Err(`集数 '${episode_number}' 不合法`);
    }
    return Result.Err("季或者剧集信息异常");
  }

  async process_parsed_movie_list(scope?: { name: string }[]) {
    // console.log("[DOMAIN]searcher/index - process_parsed_movie_list", scope, this.force);
    const { user_id, drive_id, force } = this.options;
    // let page = 1;
    let next_marker: null | string = null;
    let no_more = false;

    const where: NonNullable<Parameters<typeof this.store.prisma.parsed_movie.findMany>[number]>["where"] = {
      movie_id: null,
      can_search: force ? undefined : 1,
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
      const list = await this.store.prisma.parsed_movie.findMany({
        where,
        take: PAGE_SIZE + 1,
        ...(() => {
          const cursor: { id?: string } = {};
          if (next_marker) {
            cursor.id = next_marker;
            return {
              cursor,
            };
          }
          return {} as ModelQuery<typeof this.store.prisma.parsed_movie.findMany>["cursor"];
        })(),
      });
      // console.log("找到", parsed_episode_list.length, "个需要添加的剧集", where);
      no_more = list.length < PAGE_SIZE + 1;
      next_marker = null;
      if (list.length === PAGE_SIZE + 1) {
        const last_record = list[list.length - 1];
        next_marker = last_record.id;
      }
      const correct_list = list.slice(0, PAGE_SIZE);
      for (let i = 0; i < correct_list.length; i += 1) {
        const parsed_movie = correct_list[i];
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
        this.emit(
          Events.Print,
          new ArticleLineNode({
            children: [`[${prefix}]`, " 准备添加电影信息"].map((text) => {
              return new ArticleTextNode({ text });
            }),
          })
        );
        const r = await this.process_parsed_movie({ parsed_movie });
        if (r.error) {
          this.emit(
            Events.Print,
            new ArticleLineNode({
              children: [`[${prefix}]`, "添加电影详情失败", r.error.message].map((text) => {
                return new ArticleTextNode({ text });
              }),
            })
          );
        }
      }
    } while (no_more === false);
  }
  /**
   * 根据 parsed_movie 搜索电视剧详情
   */
  async search_movie_profile_with_parsed_movie(movie: ParsedMovieRecord) {
    const { name, original_name, correct_name } = movie;
    const prefix = [correct_name, name, original_name].filter(Boolean).join("/");
    const movie_profile_in_tmdb_res = await (async () => {
      if (correct_name) {
        //       log(`[${prefix}]`, "使用", correct_name, "搜索");
        const r = await this.search_movie_in_tmdb(correct_name);
        if (r.error) {
          return Result.Err(r.error);
        }
        return Result.Ok(r.data);
      }
      if (name) {
        //       log(`[${prefix}]`, "使用", name, "搜索");
        const r = await this.search_movie_in_tmdb(name);
        if (r.error) {
          return Result.Err(r.error);
        }
        return Result.Ok(r.data);
      }
      if (original_name) {
        const processed_original_name = original_name.split(".").join(" ");
        const r = await this.search_movie_in_tmdb(processed_original_name);
        if (r.error) {
          return Result.Err(r.error);
        }
        return Result.Ok(r.data);
      }
      return Result.Ok(null);
    })();
    if (movie_profile_in_tmdb_res.error) {
      return Result.Err(movie_profile_in_tmdb_res.error);
    }
    const movie_profile_in_tmdb = movie_profile_in_tmdb_res.data;
    if (movie_profile_in_tmdb === null) {
      return Result.Ok(null);
    }
    console.log(`[${prefix}]`, "搜索到的电影为", movie_profile_in_tmdb.name || movie_profile_in_tmdb.original_name);
    return Result.Ok(movie_profile_in_tmdb);
  }
  /**
   * 新增电影和电影详情
   */
  async process_parsed_movie(body: { parsed_movie: ParsedMovieRecord }) {
    const { parsed_movie } = body;
    const { id } = parsed_movie;
    const profile_res = await this.search_movie_profile_with_parsed_movie(parsed_movie);
    if (profile_res.error) {
      return Result.Err(profile_res.error);
    }
    if (profile_res.data === null) {
      this.store.update_parsed_episode(id, {
        can_search: 0,
      });
      return Result.Err("没有搜索到电影详情");
    }
    const profile = profile_res.data;
    return this.link_movie_profile_to_parsed_movie({
      parsed_movie,
      profile,
    });
  }
  /**
   * 将 从三方平台搜索到的详情信息，和索引文件夹解析出的 parsed_movie 进行关联
   * 首先根据 从三方平台搜索到的详情信息 创建 tv 记录，如果没有 tv 记录，就创建再关联
   * 如果有，就直接关联
   */
  async link_movie_profile_to_parsed_movie(body: { parsed_movie: ParsedMovieRecord; profile: MovieProfileRecord }) {
    const { user_id } = this.options;
    const { parsed_movie, profile } = body;
    const { name, original_name, correct_name } = parsed_movie;
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
          children: [`[${prefix}]`, "新增电影详情成功，匹配的电影是", ` [${profile.name}]`].map((text) => {
            return new ArticleTextNode({ text });
          }),
        })
      );
      this.emit(Events.MovieAdded, adding_res.data);
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
  async get_movie_profile_with_tmdb_id(info: { tmdb_id: number; original_language?: string }) {
    const { tmdb_id } = info;
    const unique_id = String(tmdb_id);
    if (this.cached_movie_profiles[unique_id]) {
      return Result.Ok(this.cached_movie_profiles[unique_id]);
    }
    const existing_res = await this.store.find_movie_profile({
      unique_id,
    });
    if (existing_res.data) {
      this.cached_movie_profiles[unique_id] = existing_res.data;
      return Result.Ok(existing_res.data);
    }
    const profile_res = await this.client.fetch_movie_profile(tmdb_id);
    if (profile_res.error) {
      return Result.Err(profile_res.error);
    }
    const profile = profile_res.data;
    const body = await this.normalize_movie_profile(profile);
    this.cached_movie_profiles[unique_id] = {
      ...body,
      id: r_id(),
      created: new Date(),
      updated: new Date(),
      source: 1,
      sources: JSON.stringify({ tmdb_id }),
    };
    await this.store.prisma.movie_profile.create({
      data: this.cached_movie_profiles[unique_id],
    });
    return Result.Ok(this.cached_movie_profiles[unique_id]);
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
