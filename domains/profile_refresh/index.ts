import dayjs from "dayjs";
import { Handler } from "mitt";

import { BaseDomain } from "@/domains/base";
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
import { TMDBClient } from "@/domains/tmdb";
import { ArticleLineNode, ArticleSectionNode, ArticleTextNode } from "@/domains/article";
import { User } from "@/domains/user";
import { MediaSearcher } from "@/domains/searcher";
import { EpisodeProfileFromTMDB, PartialSeasonFromTMDB, TVProfileFromTMDB } from "@/domains/tmdb/services";
import { season_to_num } from "@/utils";
import { Result } from "@/types";

import {
  check_episode_profile_need_refresh,
  check_movie_need_refresh,
  check_season_profile_need_refresh,
  check_tv_profile_need_refresh,
} from "./utils";
import { MediaProfileSourceTypes } from "@/constants";

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
  tmdb_token: string;
  on_print?: (node: ArticleLineNode | ArticleSectionNode) => void;
  on_finish?: () => void;
};
export class ProfileRefresh extends BaseDomain<TheTypesOfEvents> {
  user: ProfileRefreshProps["user"];
  searcher: ProfileRefreshProps["searcher"];
  client: TMDBClient;
  store: ProfileRefreshProps["store"];
  //   on_print: ProfileRefreshProps["on_print"];

  constructor(props: ProfileRefreshProps) {
    super();

    const { user, tmdb_token, searcher, store, on_print, on_finish } = props;
    this.store = store;
    this.user = user;
    this.searcher = searcher;
    this.client = new TMDBClient({ token: tmdb_token });
    if (on_print) {
      this.on_print(on_print);
    }
    if (on_finish) {
      this.on_finish(on_finish);
    }
  }
  /**
   * 读取数据库所有电视剧、季、电影详情并和 TMDB 比较是否有更新，如果有就更新数据库记录
   */
  async refresh_tv_list() {
    const page_size = 20;
    let page = 1;
    let no_more = false;
    const where: ModelQuery<typeof this.store.prisma.tv.findMany>["where"] = {
      OR: [
        {
          profile: {
            created: {
              gte: dayjs().subtract(1, "month").toISOString(),
            },
            // first_air_date: {
            //   lt: new Date()
            // }
          },
        },
        {
          profile: {
            first_air_date: null,
          },
        },
      ],
    };
    const count = await this.store.prisma.tv.count({
      where,
    });
    do {
      const list = await this.store.prisma.tv.findMany({
        where,
        include: {
          profile: true,
        },
        skip: (page - 1) * page_size,
        take: page_size,
      });
      no_more = list.length + (page - 1) * page_size >= count;
      page += 1;
      for (let i = 0; i < list.length; i += 1) {
        const tv = list[i];
        await this.refresh_tv_profile(tv);
      }
    } while (no_more === false);
    return Result.Ok(null);
  }
  /**
   * 根据数据库中的「电视剧详情」记录，刷新。如果存在新的 tmdb_id，使用该 tmdb 记录替换已存在的
   */
  async refresh_tv_profile(tv: TVRecord & { profile: TVProfileRecord }, extra?: { tmdb_id: number }) {
    const { name, original_name, unique_id } = tv.profile;
    const correct_tmdb_id = extra ? extra.tmdb_id : Number(unique_id);
    const r = await this.client.fetch_tv_profile(correct_tmdb_id);
    if (r.error) {
      // console.log(tv.profile, extra);
      return Result.Err(r.error);
    }
    const normalized_profile = await this.searcher.normalize_tv_profile(r.data);
    const diff = check_tv_profile_need_refresh(tv.profile, normalized_profile);
    if (diff) {
      await (async () => {
        if (!diff.unique_id) {
          this.emit(
            Events.Print,
            new ArticleSectionNode({
              children: [
                new ArticleLineNode({
                  children: [name || original_name, "需要更新"].map((text) => {
                    return new ArticleTextNode({ text: text! });
                  }),
                }),
                ...Object.keys(diff).map((k) => {
                  // @ts-ignore
                  const prev_text = tv.profile[k];
                  // @ts-ignore
                  const latest_text = diff[k];
                  return new ArticleLineNode({
                    children: [`${k} 从 ${prev_text} 更新为 ${latest_text}`].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  });
                }),
              ],
            })
          );
          const r = await this.store.update_tv_profile(tv.profile.id, diff);
          if (r.error) {
            this.emit(
              Events.Print,
              new ArticleSectionNode({
                children: [
                  new ArticleLineNode({
                    children: ["更新失败，因为 ", r.error.message].map((text) => {
                      return new ArticleTextNode({ text: text! });
                    }),
                  }),
                ],
              })
            );
          }
          return;
        }
        this.emit(
          Events.Print,
          new ArticleSectionNode({
            children: [
              new ArticleLineNode({
                children: [name || original_name, " 更改为另一个详情"].map((text) => {
                  return new ArticleTextNode({ text: text! });
                }),
              }),
              new ArticleLineNode({
                children: ["新的详情是 ", normalized_profile.name].map((text) => {
                  return new ArticleTextNode({ text: text! });
                }),
              }),
            ],
          })
        );
        const created_res = await (async () => {
          const existing_res = await this.store.find_tv_profile({
            unique_id: normalized_profile.unique_id,
          });
          if (existing_res.data) {
            return Result.Ok(existing_res.data);
          }
          return this.store.add_tv_profile({
            ...normalized_profile,
            source: 1,
            sources: JSON.stringify({ tmdb_id: correct_tmdb_id }),
          });
        })();
        if (created_res.error) {
          this.emit(
            Events.Print,
            new ArticleSectionNode({
              children: [
                new ArticleLineNode({
                  children: ["新增详情失败", created_res.error.message].map((text) => {
                    return new ArticleTextNode({ text: text! });
                  }),
                }),
              ],
            })
          );
        }
        if (created_res.data) {
          const r = await this.store.update_tv(tv.id, {
            profile_id: created_res.data.id,
          });
          if (r.error) {
            this.emit(
              Events.Print,
              new ArticleSectionNode({
                children: [
                  new ArticleLineNode({
                    children: ["更改失败，因为 ", r.error.message].map((text) => {
                      return new ArticleTextNode({ text: text! });
                    }),
                  }),
                ],
              })
            );
          }
          tv.profile.unique_id = created_res.data.unique_id;
        }
      })();
    }
    await this.refresh_season_list(tv, r.data);
    await this.refresh_episodes_of_tv(tv);
    return Result.Ok(normalized_profile);
  }
  async refresh_season_list(tv: TVRecord, tv_profile_from_tmdb: TVProfileFromTMDB) {
    const seasons = await this.store.prisma.season.findMany({
      where: {
        profile: {
          source: {
            not: MediaProfileSourceTypes.Other,
          },
        },
        tv_id: tv.id,
        user_id: this.user.id,
      },
      include: {
        profile: true,
      },
    });
    for (let i = 0; i < seasons.length; i += 1) {
      const season = seasons[i];
      const { season_text } = season;
      const season_number = season_to_num(season_text);
      await (async () => {
        const new_season_profile = tv_profile_from_tmdb.seasons.find((s) => {
          return s.season_number === season_number;
        });
        if (!new_season_profile) {
          this.emit(
            Events.Print,
            new ArticleSectionNode({
              children: [
                new ArticleLineNode({
                  children: [season.profile.name, season_number.toString(), "没有找到新的季详情"].map((text) => {
                    return new ArticleTextNode({ text: text! });
                  }),
                }),
              ],
            })
          );
          return;
        }
        await this.refresh_season_profile(season, new_season_profile);
      })();
    }
    return Result.Ok(null);
  }
  async refresh_season_profile(
    season: SeasonRecord & {
      profile: SeasonProfileRecord;
    },
    new_profile: PartialSeasonFromTMDB,
    extra?: { tmdb_id: number }
  ) {
    const { name } = season.profile;
    const normalized_profile = await this.searcher.normalize_season_profile(new_profile);
    const diff = check_season_profile_need_refresh(season.profile, normalized_profile);
    if (!diff) {
      return Result.Ok(null);
    }
    const prefix = [name].join("-");
    this.emit(
      Events.Print,
      new ArticleSectionNode({
        children: [
          new ArticleLineNode({
            children: [`「${prefix}」`, "需要更新"].map((text) => {
              return new ArticleTextNode({ text: text! });
            }),
          }),
          ...Object.keys(diff).map((k) => {
            // @ts-ignore
            const prev_text = season.profile[k];
            // @ts-ignore
            const latest_text = diff[k];
            return new ArticleLineNode({
              children: [`${k} 从 ${prev_text} 更新为 ${latest_text}`].map((text) => {
                return new ArticleTextNode({ text });
              }),
            });
          }),
        ],
      })
    );
    if (!diff.unique_id) {
      await this.store.prisma.season_profile.update({
        where: {
          id: season.profile.id,
        },
        data: {
          updated: dayjs().toISOString(),
          ...diff,
        },
      });
      return Result.Ok(normalized_profile);
    }
    const created_res = await (async () => {
      const existing_res = await this.store.find_season_profile({
        unique_id: normalized_profile.unique_id,
      });
      if (existing_res.data) {
        return Result.Ok(existing_res.data);
      }
      return this.store.add_season_profile(normalized_profile);
    })();
    if (created_res.data) {
      await this.store.prisma.season.update({
        where: {
          id: season.id,
        },
        data: {
          updated: dayjs().toISOString(),
          profile_id: created_res.data.id,
        },
      });
    }
    return Result.Ok(normalized_profile);
  }
  async refresh_episodes_of_tv(tv: TVRecord & { profile: TVProfileRecord }) {
    const seasons = await this.store.prisma.episode.groupBy({
      where: {
        tv_id: tv.id,
        user_id: this.user.id,
      },
      by: ["season_text"],
    });
    for (let i = 0; i < seasons.length; i += 1) {
      await (async () => {
        const season = seasons[i];
        const { season_text } = season;
        const s_n = season_to_num(season_text);
        if (typeof s_n === "string") {
          return;
        }
        const r = await this.client.fetch_season_profile({
          tv_id: Number(tv.profile.unique_id),
          season_number: s_n,
        });
        if (r.error) {
          return;
        }
        const new_season_profile = r.data;
        const episodes = await this.store.prisma.episode.findMany({
          where: {
            tv_id: tv.id,
            season_text,
            user_id: this.user.id,
          },
          include: {
            profile: true,
          },
        });
        for (let j = 0; j < episodes.length; j += 1) {
          await (async () => {
            const e = episodes[j];
            // const prev_episode_profile = e.profile;
            let matched_episode_text = e.episode_text.match(/[0-9]{1,}/);
            if (!matched_episode_text) {
              return;
            }
            const e_number = Number(matched_episode_text[0]);
            const next_episode_profile = (() => {
              const matched = new_season_profile.episodes.find((e) => {
                return e.episode_number === e_number;
              });
              return matched;
            })();
            if (!next_episode_profile) {
              return;
            }
            await this.refresh_episode_profile(e, next_episode_profile);
          })();
        }
      })();
    }
    return Result.Ok(null);
  }
  async refresh_episode_profile(
    episode: EpisodeRecord & {
      profile: EpisodeProfileRecord;
    },
    new_profile: EpisodeProfileFromTMDB
  ) {
    const { name } = episode.profile;
    const correct_tmdb_id = new_profile.id;
    const normalized_profile = await this.searcher.normalize_episode_profile(new_profile);
    const diff = check_episode_profile_need_refresh(episode.profile, normalized_profile);
    if (!diff) {
      return Result.Ok(null);
    }
    const prefix = [name, episode.episode_number].join("-");
    this.emit(
      Events.Print,
      new ArticleSectionNode({
        children: [
          new ArticleLineNode({
            children: [prefix, "需要更新"].map((text) => {
              return new ArticleTextNode({ text: text! });
            }),
          }),
          ...Object.keys(diff).map((k) => {
            // @ts-ignore
            const prev_text = episode.profile[k];
            // @ts-ignore
            const latest_text = diff[k];
            return new ArticleLineNode({
              children: [`${k} 从 ${prev_text} 更新为 ${latest_text}`].map((text) => {
                return new ArticleTextNode({ text });
              }),
            });
          }),
        ],
      })
    );
    if (!diff.unique_id) {
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
    const created_res = await (async () => {
      const existing_res = await this.store.find_episode_profile({
        unique_id: normalized_profile.unique_id,
      });
      if (existing_res.data) {
        return Result.Ok(existing_res.data);
      }
      return this.store.add_episode_profile({
        ...normalized_profile,
        source: 1,
        sources: JSON.stringify({ tmdb_id: correct_tmdb_id }),
      });
    })();
    if (created_res.data) {
      await this.store.prisma.episode.update({
        where: {
          id: episode.id,
        },
        data: {
          updated: dayjs().toISOString(),
          profile_id: created_res.data.id,
        },
      });
    }
    return Result.Ok(normalized_profile);
  }
  /**
   * 读取数据库所有电视剧、季、电影详情并和 TMDB 比较是否有更新，如果有就更新数据库记录
   */
  async refresh_movies() {
    const page_size = 20;
    let page = 1;
    let no_more = false;
    const where: ModelQuery<typeof this.store.prisma.movie.findMany>["where"] = {};
    const count = await this.store.prisma.movie.count({
      where,
    });
    do {
      const list = await this.store.prisma.movie.findMany({
        where,
        include: {
          profile: true,
        },
        skip: (page - 1) * page_size,
        take: page_size,
      });
      no_more = list.length + (page - 1) * page_size >= count;
      page += 1;
      for (let i = 0; i < list.length; i += 1) {
        const movie = list[i];
        await this.refresh_movie_profile(movie);
      }
    } while (no_more === false);
    return Result.Ok(null);
  }
  /** 刷新电影详情 */
  async refresh_movie_profile(
    movie: MovieRecord & {
      profile: MovieProfileRecord;
    },
    extra?: { tmdb_id: number }
  ) {
    const { name, original_name, unique_id } = movie.profile;
    const correct_tmdb_id = extra ? extra.tmdb_id : Number(unique_id);
    const r = await this.client.fetch_movie_profile(correct_tmdb_id);
    if (r.error) {
      return Result.Err(r.error);
    }
    const normalized_profile = await this.searcher.normalize_movie_profile(r.data);
    const diff = check_movie_need_refresh(movie.profile, normalized_profile);
    if (!diff) {
      return Result.Ok(null);
    }
    this.emit(
      Events.Print,
      new ArticleSectionNode({
        children: [
          new ArticleLineNode({
            children: [`电影「${name || original_name}」`, "需要更新"].map((text) => {
              return new ArticleTextNode({ text: text! });
            }),
          }),
          ...Object.keys(diff).map((k) => {
            // @ts-ignore
            const prev_text = movie.profile[k];
            // @ts-ignore
            const latest_text = diff[k];
            return new ArticleLineNode({
              children: [`${k} 从 ${prev_text} 更新为 ${latest_text}`].map((text) => {
                return new ArticleTextNode({ text });
              }),
            });
          }),
        ],
      })
    );
    if (!diff.unique_id) {
      // 仅更新数据
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
    // 更换电影详情
    const created_res = await (async () => {
      const existing_res = await this.store.find_movie_profile({ unique_id: normalized_profile.unique_id });
      if (existing_res.data) {
        return Result.Ok(existing_res.data);
      }
      return this.store.add_movie_profile({
        ...normalized_profile,
        source: 1,
        sources: JSON.stringify({ tmdb_id: correct_tmdb_id }),
      });
    })();
    if (created_res.data) {
      // console.log("创建电影详情成功", created_res.data);
      const r = await this.store.update_movie(movie.id, {
        profile_id: created_res.data.id,
      });
      if (r.error) {
        return Result.Err(r.error);
      }
    }
    return Result.Ok(normalized_profile);
  }

  on_print(handler: Handler<TheTypesOfEvents[Events.Print]>) {
    return this.on(Events.Print, handler);
  }
  on_finish(handler: Handler<TheTypesOfEvents[Events.Finish]>) {
    return this.on(Events.Finish, handler);
  }
}
