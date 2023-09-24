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
import { walk_model_with_cursor } from "@/domains/store/utils";
import { season_to_num } from "@/utils";
import { Result, Unpacked } from "@/types";
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
    this.searcher.on_print((node) => {
      this.emit(Events.Print, node);
    });
    this.client = new TMDBClient({ token: user.settings.tmdb_token });
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
    const where: ModelQuery<"season"> = {
      OR: [
        {
          profile: {
            air_date: {
              gte: dayjs().subtract(6, "month").toISOString(),
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
    const count = await this.store.prisma.season.count({
      where,
    });
    do {
      const list = await this.store.prisma.season.findMany({
        where,
        include: {
          profile: true,
          tv: {
            include: {
              profile: true,
            },
          },
        },
        skip: (page - 1) * page_size,
        take: page_size,
        orderBy: {
          profile: {
            air_date: "desc",
          },
        },
      });
      no_more = list.length + (page - 1) * page_size >= count;
      page += 1;
      for (let i = 0; i < list.length; i += 1) {
        await (async () => {
          const season = list[i];
          if (
            season.tv.profile.source &&
            [MediaProfileSourceTypes.Other, MediaProfileSourceTypes.Manual].includes(season.tv.profile.source)
          ) {
            this.emit(
              Events.Print,
              new ArticleLineNode({
                children: [
                  season.tv.profile.name || season.tv.profile.original_name || "unknown",
                  "已手动修改过详情，直接跳过",
                ].map((text) => new ArticleTextNode({ text })),
              })
            );
            return;
          }
          await this.refresh_tv_profile({
            id: season.tv.id,
            profile: season.tv.profile,
          });
        })();
      }
    } while (no_more === false);
    return Result.Ok(null);
  }
  /**
   * 根据数据库中的「电视剧详情」记录，刷新。如果存在新的 tmdb_id，使用该 tmdb 记录替换已存在的
   */
  async refresh_tv_profile(
    payload: {
      id: string;
      profile: TVProfileRecord;
    },
    extra?: { tmdb_id: number }
  ) {
    const { name, original_name, unique_id } = payload.profile;
    const correct_tmdb_id = extra ? extra.tmdb_id : Number(unique_id);
    const prefix = `「${name || original_name}」`;
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: [prefix, "刷新电视剧详情"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const r1 = await this.client.fetch_tv_profile(correct_tmdb_id);
    if (r1.error) {
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [prefix, "获取电视剧详情失败，因为", r1.error.message].map((text) => new ArticleTextNode({ text })),
        })
      );
      return Result.Err(r1.error);
    }
    const normalized_profile = await this.searcher.normalize_tv_profile(r1.data);
    // console.log("[DOMAIN]profile_refresh - before check_tv_profile_need_refresh");
    // console.log(payload.profile);
    // console.log(normalized_profile);
    const diff = check_tv_profile_need_refresh(payload.profile, normalized_profile);
    if (!diff) {
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [prefix, "内容没有变化，直接跳过"].map((text) => {
            return new ArticleTextNode({ text: text! });
          }),
        })
      );
      return Result.Ok({
        ...normalized_profile,
        seasons: r1.data.seasons,
      });
    }
    if (!diff.unique_id) {
      // 仅仅更新字段，不更换内容
      this.emit(
        Events.Print,
        new ArticleSectionNode({
          children: [
            new ArticleLineNode({
              children: [prefix, "需要更新"].map((text) => {
                return new ArticleTextNode({ text: text! });
              }),
            }),
            new ArticleLineNode({
              children: [JSON.stringify(diff)].map((text) => {
                return new ArticleTextNode({ text: text! });
              }),
            }),
            // ...Object.keys(diff).map((k) => {
            //   // @ts-ignore
            //   const prev_text = payload.profile[k];
            //   // @ts-ignore
            //   const latest_text = diff[k];
            //   return new ArticleLineNode({
            //     children: [`${k} 从 ${prev_text} 更新为 ${latest_text}`].map((text) => {
            //       return new ArticleTextNode({ text });
            //     }),
            //   });
            // }),
          ],
        })
      );
      const r = await this.store.update_tv_profile(payload.profile.id, diff);
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
      return Result.Ok({
        ...normalized_profile,
        seasons: r1.data.seasons,
      });
    }
    // 详情改变了
    this.emit(
      Events.Print,
      new ArticleSectionNode({
        children: [
          new ArticleLineNode({
            children: [prefix, "更改为另一个详情"].map((text) => {
              return new ArticleTextNode({ text: text! });
            }),
          }),
          new ArticleLineNode({
            children: [prefix, "新的详情是 ", normalized_profile.name].map((text) => {
              return new ArticleTextNode({ text: text! });
            }),
          }),
        ],
      })
    );
    const created_res = await (async () => {
      const r1 = await this.store.find_tv_profile({
        unique_id: normalized_profile.unique_id,
      });
      if (r1.data) {
        return Result.Ok(r1.data);
      }
      const r2 = await this.store.add_tv_profile({
        ...normalized_profile,
        source: 1,
        sources: JSON.stringify({ tmdb_id: correct_tmdb_id }),
      });
      if (r2.error) {
        return Result.Err(r2.error.message);
      }
      return Result.Ok(r2.data);
    })();
    if (created_res.error) {
      this.emit(
        Events.Print,
        new ArticleSectionNode({
          children: [
            new ArticleLineNode({
              children: [prefix, "获取详情失败", created_res.error.message].map((text) => {
                return new ArticleTextNode({ text: text! });
              }),
            }),
          ],
        })
      );
      return Result.Err(created_res.error.message);
    }
    const base_tv = await this.store.prisma.tv.findFirst({
      where: {
        profile_id: created_res.data.id,
      },
    });
    if (!base_tv) {
      new ArticleSectionNode({
        children: [
          new ArticleLineNode({
            children: [prefix, "没有同名电视剧，直接改变关联详情"].map((text) => {
              return new ArticleTextNode({ text: text! });
            }),
          }),
        ],
      });
      await this.store.prisma.tv.update({
        where: {
          id: payload.id,
        },
        data: {
          profile_id: created_res.data.id,
        },
      });
      return Result.Ok({
        ...normalized_profile,
        unique_id: created_res.data.unique_id,
        seasons: r1.data.seasons,
      });
    }
    this.emit(
      Events.Print,
      new ArticleSectionNode({
        children: [
          new ArticleLineNode({
            children: [prefix, "已存在同名电视剧，清除关联的解析结果，不影响当前电视剧"].map((text) => {
              return new ArticleTextNode({ text: text! });
            }),
          }),
        ],
      })
    );
    // 将 A 的所有季、剧集都归属到 B（合并两个季的所有
    // 如果不这样做，也和上面一样直接更新，就会出现两个相同的 tv
    await this.store.prisma.parsed_episode.updateMany({
      where: {
        episode: {
          tv_id: payload.id,
        },
        user_id: this.user.id,
      },
      data: {
        episode_id: null,
      },
    });
    await this.store.prisma.parsed_season.updateMany({
      where: {
        season: {
          tv_id: payload.id,
        },
        user_id: this.user.id,
      },
      data: {
        season_id: null,
      },
    });
    const parsed_tvs = await this.store.prisma.parsed_tv.findMany({
      where: {
        tv_id: payload.id,
        user_id: this.user.id,
      },
    });
    await this.store.prisma.parsed_tv.updateMany({
      where: {
        tv_id: payload.id,
        user_id: this.user.id,
      },
      data: {
        tv_id: base_tv.id,
      },
    });
    return Result.Ok({
      ...normalized_profile,
      unique_id: created_res.data.unique_id,
      seasons: r1.data.seasons,
      scopes: parsed_tvs.map((tv) => {
        return {
          name: tv.name || tv.original_name,
        };
      }),
    });
  }
  /** 刷新多个季详情 */
  async refresh_season_list(
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
          {
            air_date: {
              gte: dayjs().subtract(3, "month").toISOString(),
            },
          },
          {
            air_date: null,
          },
        ],
      },
      user_id: this.user.id,
    };
    const count = await this.store.prisma.season.count({ where });
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: ["共", String(count), "个季需要刷新"].map((text) => new ArticleTextNode({ text })),
      })
    );
    await walk_model_with_cursor(
      (extra) => {
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
      {
        page_size: 20,
        handler: async (season, i) => {
          this.emit(
            Events.Print,
            new ArticleLineNode({
              children: [`第${i + 1}个`].map((text) => new ArticleTextNode({ text })),
            })
          );
          await this.refresh_season_profile({
            season,
            tv: season.tv,
          });
          if (after) {
            await after({
              season,
              tv: season.tv,
            });
          }
        },
      }
    );
    return Result.Ok(null);
  }
  async refresh_season_profile(
    payload: {
      season: SeasonRecord & {
        profile: SeasonProfileRecord;
      };
      tv: TVRecord & { profile: TVProfileRecord };
    },
    extra?: { tmdb_id: number }
  ) {
    const { season, tv } = payload;
    const prefix = `「${[tv.profile.name, season.season_text].join("/")}」`;
    const r1 = await this.refresh_tv_profile({ id: tv.id, profile: tv.profile }, extra);
    if (r1.error) {
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [prefix, "刷新电视剧详情失败", r1.error.message].map((text) => new ArticleTextNode({ text })),
        })
      );
      return Result.Err(r1.error.message);
    }
    if (r1.data.unique_id === tv.profile.unique_id) {
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [prefix, "电视剧详情没有变化，继续刷新季详情"].map((text) => new ArticleTextNode({ text })),
        })
      );
      const new_season_profile = r1.data.seasons.find((s) => {
        return s.season_number === season.season_number;
      });
      if (!new_season_profile) {
        this.emit(
          Events.Print,
          new ArticleLineNode({
            children: [prefix, "没有匹配的季详情"].map((text) => new ArticleTextNode({ text })),
          })
        );
        return Result.Err("没有匹配的季详情");
      }
      const normalized_profile = await this.searcher.normalize_season_profile(new_season_profile);
      const diff = check_season_profile_need_refresh(season.profile, normalized_profile);
      if (!diff) {
        this.emit(
          Events.Print,
          new ArticleLineNode({
            children: [prefix, "季没有变更内容，跳过"].map((text) => new ArticleTextNode({ text })),
          })
        );
        return Result.Ok(null);
      }
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
        this.emit(
          Events.Print,
          new ArticleLineNode({
            children: [prefix, "详情不变，只做更新操作"].map((text) => new ArticleTextNode({ text })),
          })
        );
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
        this.emit(
          Events.Print,
          new ArticleLineNode({
            children: [prefix, "详情变更成另一个电视剧了"].map((text) => new ArticleTextNode({ text })),
          })
        );
        const existing_res = await this.store.find_season_profile({
          unique_id: normalized_profile.unique_id,
        });
        if (existing_res.data) {
          return Result.Ok(existing_res.data);
        }
        return this.store.add_season_profile(normalized_profile);
      })();
      if (created_res.data) {
        this.emit(
          Events.Print,
          new ArticleLineNode({
            children: [prefix, "绑定新的电视剧详情"].map((text) => new ArticleTextNode({ text })),
          })
        );
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
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: [prefix, "电视剧详情变更了，重新搜索季详情"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const scopes: { name: string }[] =
      // @ts-ignore
      r1.data.scopes ||
      [r1.data.name, r1.data.original_name].filter(Boolean).map((name) => {
        return { name } as { name: string };
      });
    this.emit(
      Events.Print,
      new ArticleLineNode({
        children: [prefix, ...scopes.map((s) => s.name)].map((text) => new ArticleTextNode({ text })),
      })
    );
    await this.searcher.process_parsed_season_list(scopes);
    await this.searcher.process_parsed_episode_list(scopes);
    return Result.Ok(null);
  }
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
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: ["获取季详情失败", r.error.message].map((text) => new ArticleTextNode({ text })),
        })
      );
      return Result.Err(r.error.message);
    }
    const new_season_profile = r.data;
    const episodes = await this.store.prisma.episode.findMany({
      where: {
        season: {
          id: season.id,
        },
        user_id: this.user.id,
      },
      include: {
        profile: true,
      },
    });
    for (let j = 0; j < episodes.length; j += 1) {
      await (async () => {
        const episode = episodes[j];
        const prefix = `「${tv.profile.name}/${season.season_text}/${episode.episode_text}」`;
        if (!episode.episode_number) {
          this.emit(
            Events.Print,
            new ArticleLineNode({
              children: [prefix, "没有正确的剧集数"].map((text) => new ArticleTextNode({ text })),
            })
          );
          return;
        }
        const matched = new_season_profile.episodes.find((e) => {
          return e.episode_number === episode.episode_number;
        });
        if (!matched) {
          this.emit(
            Events.Print,
            new ArticleLineNode({
              children: [prefix, "没有匹配的剧集详情"].map((text) => new ArticleTextNode({ text })),
            })
          );
          return;
        }
        await this.refresh_episode_profile(episode, matched);
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
    const prefix = [name, episode.episode_number].join("-");
    const normalized_profile = await this.searcher.normalize_episode_profile(new_profile);
    const diff = check_episode_profile_need_refresh(episode.profile, normalized_profile);
    if (!diff) {
      this.emit(
        Events.Print,
        new ArticleLineNode({
          children: [prefix, "没有变更内容"].map((text) => new ArticleTextNode({ text })),
        })
      );
      return Result.Ok(null);
    }
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
    const where: ModelQuery<"movie"> = {
      OR: [
        {
          profile: {
            air_date: {
              gte: dayjs().subtract(3, "month").toISOString(),
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
        orderBy: {
          profile: {
            air_date: "desc",
          },
        },
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
    this.emit(
      Events.Print,
      new ArticleSectionNode({
        children: [
          new ArticleLineNode({
            children: [`处理电影「${name || original_name}」`].map((text) => {
              return new ArticleTextNode({ text: text! });
            }),
          }),
        ],
      })
    );
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
      await this.store.prisma.movie.update({
        where: {
          id: movie.id,
        },
        data: {
          profile_id: created_res.data.id,
        },
      });
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
