/**
 * @file 影视剧详情更新、变更
 */
import dayjs from "dayjs";

import { BaseDomain, Handler } from "@/domains/base";
import { DatabaseStore } from "@/domains/store";
import {
  EpisodeProfileRecord,
  EpisodeRecord,
  ModelQuery,
  MovieProfileRecord,
  MovieRecord,
  SeasonProfileRecord,
  SeasonRecord,
  TVProfileRecord,
  TVRecord,
} from "@/domains/store/types";
import { TMDBClient } from "~/src/domains/media_profile/tmdb";
import { EpisodeProfileFromTMDB } from "~/src/domains/media_profile/tmdb/services";
import { Article, ArticleLineNode, ArticleSectionNode } from "@/domains/article";
import { User } from "@/domains/user";
import { MediaSearcher } from "@/domains/searcher/v2";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { Result } from "@/domains/result/index";
import { MediaProfileSourceTypes } from "@/constants";

import {
  check_episode_profile_need_refresh,
  check_movie_need_refresh,
  check_season_profile_need_refresh,
  check_tv_profile_need_refresh,
} from "./utils";

enum Events {
  Print,
  Finish,
}
type TheTypesOfEvents = {
  [Events.Print]: ArticleLineNode | ArticleSectionNode;
  [Events.Finish]: void;
};
type ProfileRefreshProps = {
  user: User;
  searcher: MediaSearcher;
  store: DatabaseStore;
  on_print?: (node: ArticleLineNode | ArticleSectionNode) => void;
  on_finish?: () => void;
};
export class ProfileRefresh extends BaseDomain<TheTypesOfEvents> {
  static New() {}

  user: ProfileRefreshProps["user"];
  searcher: ProfileRefreshProps["searcher"];
  client: TMDBClient;
  store: ProfileRefreshProps["store"];

  constructor(props: ProfileRefreshProps) {
    super();

    const { user, searcher, store, on_print, on_finish } = props;
    this.store = store;
    this.user = user;
    this.searcher = searcher;
    this.client = new TMDBClient({ token: user.settings.tmdb_token });
    if (on_print) {
      this.on_print(on_print);
    }
    if (on_finish) {
      this.on_finish(on_finish);
    }
  }
  /** 读取数据库所有电视剧和三方平台比较是否有更新，如果有就更新数据库记录 */
  async refresh_tv_list(gte = dayjs().subtract(6, "month").toISOString()) {
    const where: ModelQuery<"season"> = {
      OR: [
        {
          profile: {
            air_date: {
              gte,
            },
          },
        },
        {
          profile: {
            air_date: null,
          },
        },
      ],
      user_id: this.user.id,
    };
    const count = await this.store.prisma.season.count({ where });
    this.emit(Events.Print, Article.build_line(["共", count, "个电视剧"]));
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.season.findMany({
          where,
          include: {
            profile: true,
            tv: {
              include: {
                profile: true,
              },
            },
          },
          orderBy: {
            profile: {
              air_date: "desc",
            },
          },
          ...extra,
        });
      },
      handler: async (season) => {
        if (
          season.profile.source &&
          [MediaProfileSourceTypes.Other, MediaProfileSourceTypes.Manual].includes(season.profile.source)
        ) {
          this.emit(
            Events.Print,
            Article.build_line([
              season.tv.profile.name || season.tv.profile.original_name || "unknown",
              "已手动修改过详情，直接跳过",
            ])
          );
          return;
        }
        await this.refresh_season_profile({
          season,
          tv: season.tv,
        });
      },
    });
    return Result.Ok(null);
  }
  /** 刷新多个季详情 */
  async refresh_season_list(
    gte?: string,
    lifetimes: Partial<{
      after: (payload: {
        season: SeasonRecord & { profile: SeasonProfileRecord };
        tv: TVRecord & { profile: TVProfileRecord };
      }) => void;
    }> = {}
  ) {
    const { after } = lifetimes;
    const where: ModelQuery<"season"> = {
      profile: {
        source: {
          notIn: [MediaProfileSourceTypes.Other, MediaProfileSourceTypes.Manual],
        },
        OR: [
          gte
            ? {
                air_date: {
                  gte,
                },
              }
            : {},
          {
            air_date: null,
          },
        ].filter((v) => Object.keys(v).length > 0),
      },
      user_id: this.user.id,
    };
    const count = await this.store.prisma.season.count({ where });
    this.emit(Events.Print, Article.build_line(["共", count, "个季"]));
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.season.findMany({
          where,
          include: {
            profile: true,
            tv: {
              include: {
                profile: true,
              },
            },
          },
          ...extra,
        });
      },
      page_size: 20,
      handler: async (season, i) => {
        this.emit(Events.Print, Article.build_line([`第${i + 1}个`]));
        const r = await this.refresh_season_profile({
          season,
          tv: season.tv,
        });
        if (r.error) {
          this.emit(Events.Print, Article.build_line(["刷新失败", r.error.message]));
          return;
        }
        if (after) {
          await after({
            season,
            tv: season.tv,
          });
        }
      },
    });
    return Result.Ok(null);
  }
  /** 刷新多个剧集记录 */
  async refresh_episode_list(payload: {
    season: SeasonRecord & { profile: SeasonProfileRecord };
    tv: TVRecord & { profile: TVProfileRecord };
  }) {
    const { tv, season } = payload;
    const r = await this.client.fetch_season_profile({
      tv_id: Number(tv.profile.unique_id),
      season_number: season.season_number,
    });
    if (r.error) {
      this.emit(Events.Print, Article.build_line(["获取季详情失败", r.error.message]));
      return Result.Err(r.error.message);
    }
    const new_season_profile = r.data;
    const where: ModelQuery<"episode"> = {
      season: {
        id: season.id,
      },
      user_id: this.user.id,
    };
    const count = await this.store.prisma.episode.count({ where });
    this.emit(Events.Print, Article.build_line(["共", count, "个剧集"]));
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.episode.findMany({
          where,
          include: {
            profile: true,
          },
          orderBy: {
            episode_number: "asc",
          },
          ...extra,
        });
      },
      handler: async (episode, index) => {
        // this.emit(Events.Print, Article.build_line(["第", index + 1, "个"]));
        const prefix = `[${episode.episode_text}/${tv.profile.name}]`;
        if (!episode.episode_number) {
          this.emit(Events.Print, Article.build_line([prefix, "没有正确的剧集数"]));
          return;
        }
        const matched = new_season_profile.episodes.find((e) => {
          return e.episode_number === episode.episode_number;
        });
        if (!matched) {
          this.emit(Events.Print, Article.build_line([prefix, "没有匹配的剧集详情"]));
          return;
        }
        // this.emit(Events.Print, Article.build_line([prefix, "刷新剧集"]));
        await this.refresh_episode_profile(episode, matched);
      },
    });
    return Result.Ok(null);
  }
  /** 读取数据库所有电影，刷新详情 */
  async refresh_movie_list(gte?: string) {
    const where: ModelQuery<"movie"> = {
      OR: [
        gte
          ? {
              profile: {
                air_date: {
                  gte,
                },
              },
            }
          : {},
        {
          profile: {
            air_date: null,
          },
        },
      ].filter((v) => Object.keys(v).length > 0),
      user_id: this.user.id,
    };
    const count = await this.store.prisma.movie.count({
      where,
    });
    this.emit(Events.Print, Article.build_line(["共", count, "个电影"]));
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.store.prisma.movie.findMany({
          where,
          include: {
            profile: true,
          },
          orderBy: {
            profile: {
              air_date: "desc",
            },
          },
          ...extra,
        });
      },
      handler: async (movie, index) => {
        this.emit(Events.Print, Article.build_line(["第", index + 1, "个"]));
        await this.refresh_movie_profile(movie);
      },
    });
    return Result.Ok(null);
  }
  /** 从三方获取最新的电视剧季详情，并更新本地记录 */
  async refresh_tv_profile(payload: { id: string; profile: TVProfileRecord }) {
    const { name, original_name, unique_id } = payload.profile;
    const correct_unique_id = Number(unique_id);
    const prefix = `[${name || original_name}]`;
    this.emit(Events.Print, Article.build_line([prefix, "刷新电视剧详情"]));
    const r1 = await this.client.fetch_tv_profile(correct_unique_id);
    if (r1.error) {
      this.emit(Events.Print, Article.build_line([prefix, "获取电视剧详情失败，因为", r1.error.message]));
      return Result.Err(r1.error);
    }
    const normalized_profile = await this.searcher.normalize_tv_profile(r1.data);
    const diff = check_tv_profile_need_refresh(payload.profile, normalized_profile);
    if (!diff) {
      this.emit(Events.Print, Article.build_line([prefix, "内容没有变化，直接跳过"]));
      return Result.Ok({
        ...normalized_profile,
        seasons: r1.data.seasons,
      });
    }
    if (diff.unique_id) {
      return Result.Err("更换了详情，异常情况");
    }
    this.emit(Events.Print, Article.build_line([prefix, "需要更新"]));
    this.emit(Events.Print, Article.build_line([JSON.stringify(diff)]));
    const r = await this.store.update_tv_profile(payload.profile.id, diff);
    if (r.error) {
      this.emit(Events.Print, Article.build_line(["更新失败，因为 ", r.error.message]));
    }
    return Result.Ok({
      ...normalized_profile,
      seasons: r1.data.seasons,
    });
  }
  async refresh_season_profile(payload: {
    season: SeasonRecord & {
      profile: SeasonProfileRecord;
    };
    tv: TVRecord & { profile: TVProfileRecord };
  }) {
    const { season, tv } = payload;
    const prefix = `[${[tv.profile.name, season.season_text].join("/")}]`;
    this.emit(Events.Print, Article.build_line([prefix, "刷新电视剧详情"]));
    const r1 = await this.refresh_tv_profile({ id: tv.id, profile: tv.profile });
    if (r1.error) {
      return Result.Err(r1.error.message);
    }
    if (r1.data.unique_id !== tv.profile.unique_id) {
      return Result.Err("详情发生了变更，异常情况");
    }
    this.emit(Events.Print, Article.build_line([prefix, "刷新季详情"]));
    const new_season_profile = r1.data.seasons.find((s) => {
      return s.season_number === season.season_number;
    });
    if (!new_season_profile) {
      this.emit(Events.Print, Article.build_line([prefix, "没有匹配的季详情"]));
      return Result.Err("没有匹配的季详情");
    }
    const normalized_profile = await this.searcher.normalize_season_profile(new_season_profile);
    const diff = check_season_profile_need_refresh(season.profile, normalized_profile);
    if (!diff) {
      this.emit(Events.Print, Article.build_line([prefix, "没有变更内容，跳过"]));
      return Result.Ok(null);
    }
    if (diff.unique_id) {
      return Result.Err("季详情发生了变更，异常情况");
    }
    this.emit(Events.Print, Article.build_line([prefix, "需要更新"]));
    this.emit(Events.Print, Article.build_line([JSON.stringify(diff)]));
    await this.store.prisma.season_profile.update({
      where: {
        id: season.profile.id,
      },
      data: {
        updated: dayjs().toISOString(),
        ...diff,
      },
    });
    await this.refresh_episode_list(payload);
    return Result.Ok(normalized_profile);
  }
  /** 刷新剧集详情 */
  async refresh_episode_profile(
    episode: EpisodeRecord & {
      profile: EpisodeProfileRecord;
    },
    new_profile: EpisodeProfileFromTMDB
  ) {
    const { name } = episode.profile;
    const prefix = `[${[episode.episode_text, name].join("/")}]`;
    const normalized_profile = await this.searcher.normalize_episode_profile(new_profile);
    const diff = check_episode_profile_need_refresh(episode.profile, normalized_profile);
    if (!diff) {
      this.emit(Events.Print, Article.build_line([prefix, "没有变更内容"]));
      return Result.Ok(null);
    }
    this.emit(Events.Print, Article.build_line([prefix, "需要更新"]));
    this.emit(Events.Print, Article.build_line([JSON.stringify(diff)]));
    if (diff.unique_id) {
      return Result.Err("详情发生变更，异常情况");
    }
    await this.store.prisma.episode_profile.update({
      where: {
        id: episode.profile.id,
      },
      data: {
        updated: dayjs().toISOString(),
        ...diff,
      },
    });
    return Result.Ok(normalized_profile);
  }
  /** 刷新电影详情 */
  async refresh_movie_profile(
    movie: MovieRecord & {
      profile: MovieProfileRecord;
    }
  ) {
    const { name, original_name, unique_id } = movie.profile;
    const correct_unique_id = Number(unique_id);
    const prefix = `[${name || original_name}]`;
    this.emit(Events.Print, Article.build_line([prefix, "获取电影详情"]));
    const r = await this.client.fetch_movie_profile(correct_unique_id);
    if (r.error) {
      this.emit(Events.Print, Article.build_line([prefix, "获取详情失败，因为", r.error.message]));
      return Result.Err(r.error);
    }
    const normalized_profile = await this.searcher.normalize_movie_profile(r.data);
    const diff = check_movie_need_refresh(movie.profile, normalized_profile);
    if (!diff) {
      this.emit(Events.Print, Article.build_line([prefix, "没有要更新的内容，跳过"]));
      return Result.Ok(null);
    }
    if (diff.unique_id) {
      return Result.Err("详情变更成另一个，异常情况");
    }
    this.emit(Events.Print, Article.build_line([prefix, "需要更新"]));
    this.emit(Events.Print, Article.build_line([JSON.stringify(diff)]));
    await this.store.prisma.movie_profile.update({
      where: {
        id: movie.profile.id,
      },
      data: {
        updated: dayjs().toISOString(),
        ...diff,
      },
    });
    return Result.Ok(diff);
  }
  /**
   * 根据数据库中的「电视剧详情」记录，刷新。如果存在新的 tmdb_id，使用该 tmdb 记录替换已存在的
   */
  async change_tv_profile(
    tv: {
      id: string;
      profile: TVProfileRecord;
    },
    extra: { source?: number; unique_id: string }
  ) {
    const { name, original_name } = tv.profile;
    const { source = MediaProfileSourceTypes.TMDB, unique_id } = extra;
    const correct_unique_id = (() => {
      if (source === MediaProfileSourceTypes.TMDB) {
        return Number(unique_id);
      }
      return unique_id;
    })();
    const prefix = `[${name || original_name}]`;
    this.emit(Events.Print, Article.build_line([prefix, "刷新电视剧详情"]));
    const r1 = await this.client.fetch_tv_profile(correct_unique_id);
    if (r1.error) {
      this.emit(Events.Print, Article.build_line([prefix, "获取电视剧详情失败，因为", r1.error.message]));
      return Result.Err(r1.error);
    }
    const normalized_profile = await this.searcher.normalize_tv_profile(r1.data);
    this.emit(Events.Print, Article.build_line([prefix, "新的详情是 ", normalized_profile.name]));
    const profile_record_res = await (async () => {
      // 这个逻辑不就是 searcher.get_tv_profile_with_tmdb_id 吗？
      const existing_tv_profile = await this.store.prisma.tv_profile.findFirst({
        where: {
          unique_id: normalized_profile.unique_id,
        },
      });
      if (existing_tv_profile) {
        this.emit(Events.Print, Article.build_line([prefix, "该详情已经存在"]));
        return Result.Ok(existing_tv_profile);
      }
      this.emit(Events.Print, Article.build_line([prefix, "新增详情记录"]));
      const created_tv_profile = await this.store.add_tv_profile({
        ...normalized_profile,
        // @todo 支持不同的详情数据源
        source: MediaProfileSourceTypes.TMDB,
        sources: JSON.stringify({ tmdb_id: correct_unique_id }),
      });
      if (created_tv_profile.error) {
        return Result.Err(created_tv_profile.error.message);
      }
      return Result.Ok(created_tv_profile.data);
    })();
    if (profile_record_res.error) {
      this.emit(Events.Print, Article.build_line([prefix, "获取详情失败", profile_record_res.error.message]));
      return Result.Err(profile_record_res.error.message);
    }
    const same_tv = await this.store.prisma.tv.findFirst({
      where: {
        profile_id: profile_record_res.data.id,
        user_id: this.user.id,
      },
    });
    if (!same_tv) {
      this.emit(Events.Print, Article.build_line([prefix, "没有同名电视剧，直接改变关联详情"]));
      await this.store.prisma.tv.update({
        where: {
          id: tv.id,
        },
        data: {
          profile_id: profile_record_res.data.id,
        },
      });
      // 如果该次变更成一个不存在的电视剧，那么就要删除之前的季和剧集记录，然后重新索引
      // 如果不这样做，就会存在一个没有任何剧集的空电视剧
      await this.store.prisma.season.deleteMany({
        where: {
          tv_id: tv.id,
          user_id: this.user.id,
        },
      });
      await this.store.prisma.episode.deleteMany({
        where: {
          tv_id: tv.id,
          user_id: this.user.id,
        },
      });
      // await this.store.prisma.parsed_season.updateMany({
      //   where: {
      //     parsed_tv: {
      //       tv_id: tv.id,
      //     },
      //     user_id: this.user.id,
      //   },
      //   data: {
      //     updated: dayjs().toISOString(),
      //     can_search: 1,
      //   },
      // });
      await this.store.prisma.parsed_episode.updateMany({
        where: {
          parsed_tv: {
            tv_id: tv.id,
          },
          user_id: this.user.id,
        },
        data: {
          updated: dayjs().toISOString(),
          can_search: 1,
        },
      });
      return Result.Ok({
        ...normalized_profile,
        unique_id: profile_record_res.data.unique_id,
        seasons: r1.data.seasons,
        scopes: [{ name }, { name: original_name }] as { name: string }[],
        override: true,
      });
    }
    this.emit(Events.Print, Article.build_line([prefix, "已存在同名电视剧"]));
    // 将 A 的所有季、剧集都归属到 B（合并两个季的所有
    // 将原先的解析结果重置掉，再重新索引
    // 如果不这样做，也和上面一样直接更新，就会出现两个相同的 tv
    await this.store.prisma.parsed_episode.updateMany({
      where: {
        episode: {
          tv_id: tv.id,
        },
        user_id: this.user.id,
      },
      data: {
        episode_id: null,
        season_id: null,
      },
    });
    // await this.store.prisma.parsed_season.updateMany({
    //   where: {
    //     season: {
    //       tv_id: tv.id,
    //     },
    //     user_id: this.user.id,
    //   },
    //   data: {
    //     season_id: null,
    //   },
    // });
    const parsed_tvs = await this.store.prisma.parsed_tv.findMany({
      where: {
        tv_id: tv.id,
        user_id: this.user.id,
      },
    });
    await this.store.prisma.parsed_tv.updateMany({
      where: {
        tv_id: tv.id,
        user_id: this.user.id,
      },
      data: {
        tv_id: same_tv.id,
      },
    });
    return Result.Ok({
      ...normalized_profile,
      unique_id: profile_record_res.data.unique_id,
      seasons: r1.data.seasons,
      scopes: parsed_tvs
        .map((tv) => {
          return [
            {
              name: tv.name,
            },
            {
              original_name: tv.original_name,
            },
          ];
        })
        .reduce((total, cur) => {
          return total.concat(cur);
        }, [])
        .filter((p) => p.name) as { name: string }[],
      override: false,
    });
  }
  /** 变更电影详情 */
  async change_movie_profile(
    movie: MovieRecord & {
      profile: MovieProfileRecord;
    },
    extra: { source?: number; unique_id: string }
  ) {
    const { name, original_name } = movie.profile;
    const { source = MediaProfileSourceTypes.TMDB, unique_id } = extra;
    const correct_unique_id = (() => {
      // 根据详情数据源对唯一标志进行处理
      if (source === MediaProfileSourceTypes.TMDB) {
        return Number(unique_id);
      }
      return unique_id;
    })();
    const prefix = `[${name || original_name}]`;
    const r = await this.client.fetch_movie_profile(correct_unique_id);
    if (r.error) {
      this.emit(Events.Print, Article.build_line([prefix, "获取详情失败", r.error.message]));
      return Result.Err(r.error);
    }
    const normalized_profile = await this.searcher.normalize_movie_profile(r.data);
    const diff = check_movie_need_refresh(movie.profile, normalized_profile);
    if (!diff) {
      this.emit(Events.Print, Article.build_line([prefix, "没有变更内容，跳过"]));
      return Result.Ok(null);
    }
    this.emit(Events.Print, Article.build_line([prefix, "需要更新"]));
    this.emit(Events.Print, Article.build_line([JSON.stringify(diff)]));
    if (!diff.unique_id) {
      this.emit(Events.Print, Article.build_line([prefix, "详情没有变更"]));
      return Result.Err("详情没有变更，异常情况");
    }
    const profile_record_res = await (async () => {
      const existing_movie_profile = await this.store.prisma.movie_profile.findFirst({
        where: {
          unique_id: normalized_profile.unique_id,
        },
      });
      if (existing_movie_profile) {
        this.emit(Events.Print, Article.build_line([prefix, "该详情已存在"]));
        return Result.Ok(existing_movie_profile);
      }
      this.emit(Events.Print, Article.build_line([prefix, "创建电影详情记录"]));
      return this.store.add_movie_profile({
        ...normalized_profile,
        source: MediaProfileSourceTypes.TMDB,
        sources: JSON.stringify({ tmdb_id: correct_unique_id }),
      });
    })();
    if (profile_record_res.error) {
      this.emit(Events.Print, Article.build_line([prefix, "获取详情失败", profile_record_res.error.message]));
      return Result.Err(profile_record_res.error.message);
    }
    const same_movie = await this.store.prisma.movie.findFirst({
      where: {
        profile_id: profile_record_res.data.id,
        user_id: this.user.id,
      },
    });
    if (!same_movie) {
      this.emit(Events.Print, Article.build_line([prefix, "没有同名电影，直接改变关联详情"]));
      await this.store.prisma.movie.update({
        where: {
          id: movie.id,
        },
        data: {
          profile_id: profile_record_res.data.id,
        },
      });
      return Result.Ok({
        ...normalized_profile,
        unique_id: profile_record_res.data.unique_id,
        override: true,
      });
    }
    this.emit(Events.Print, Article.build_line([prefix, "已存在同名电影"]));
    await this.store.prisma.parsed_movie.updateMany({
      where: {
        movie_id: movie.id,
        user_id: this.user.id,
      },
      data: {
        movie_id: same_movie.id,
      },
    });
    return Result.Ok({
      ...normalized_profile,
      unique_id: profile_record_res.data.unique_id,
      override: false,
    });
  }

  on_print(handler: Handler<TheTypesOfEvents[Events.Print]>) {
    return this.on(Events.Print, handler);
  }
  on_finish(handler: Handler<TheTypesOfEvents[Events.Finish]>) {
    return this.on(Events.Finish, handler);
  }
}
