/**
 * @file 影视剧详情管理
 * 1、使用 TMDB API 搜索影视剧详情，并保存详情到数据库
 * 2、获取详情时复用保存好的详情信息
 */
import dayjs from "dayjs";

import {
  DataStore,
  MediaProfileRecord,
  MediaSeriesProfileRecord,
  MediaSourceProfileRecord,
} from "@/domains/store/types";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { DriveClient } from "@/domains/clients/types";
import { FileManage } from "@/domains/uploader";
import { MediaTypes } from "@/constants";
import { Result } from "@/types";
import { r_id } from "@/utils";

import { DoubanClient } from "./douban";
import { TMDBClient } from "./tmdb_v2";
import { SearchedTVItem, SearchedSeasonProfile } from "./types";
import { format_season_name, map_season_number } from "./utils";

type MediaProfileSearchProps = {
  token: string;
  uploader: FileManage;
  store: DataStore;
};

export class MediaProfileClient {
  static New(props: { token?: string; assets: string; store: DataStore }) {
    const { token, assets, store } = props;
    if (!token) {
      return Result.Err("缺少 token");
    }
    if (!store) {
      return Result.Err("缺少 store");
    }
    if (!assets) {
      return Result.Err("静态资源根路径");
    }
    return Result.Ok(
      new MediaProfileClient({
        token,
        store,
        uploader: new FileManage({ root: assets }),
      })
    );
  }

  token: string;

  $store: DataStore;
  $upload: FileManage;
  $tmdb: TMDBClient;
  $douban: DoubanClient;

  constructor(props: MediaProfileSearchProps) {
    // super();
    const { token, uploader, store } = props;
    this.token = token;
    this.$store = store;
    this.$upload = uploader;

    this.$tmdb = new TMDBClient({
      token: this.token,
    });
    this.$douban = new DoubanClient({});
  }

  async search_season(query: { keyword: string; platform?: number; year: string | null; season_text: string | null }) {
    const keyword = (() => {
      return [query.keyword, query.season_text, query.year ? `(${query.year})` : null].filter(Boolean).join(" ");
    })();
    if (!keyword) {
      return Result.Err("请传入 keyword");
    }
    const { name, season_number, year } = (() => {
      const r1 = / {0,1}第 {0,1}([0-9]{1,}) {0,1}季/;
      const r2 = / {0,1}第 {0,1}([一二三四五六七八九十]{1,}) {0,1}季/;
      const r3 = / {0,1}[sS]([0-9]{1,})/;
      const year_r = /\(([12][0-9][0-9]{2})\)/;
      let year: null | string = null;
      let k = keyword;
      const m1 = k.match(year_r);
      if (m1) {
        year = m1[1];
        k = k.replace(m1[0], "");
      }
      const regexps = [r1, r2, r3];
      for (let i = 0; i < regexps.length; i += 1) {
        const regexp = regexps[i];
        const m = k.match(regexp);
        if (m) {
          const season_text = m[0];
          const season_number = m[1] ? map_season_number(m[1]) : null;
          const name = k.replace(season_text, "").trim();
          return {
            name,
            //     season_text,
            season_number,
            year,
          };
        }
      }
      return {
        name: k,
        // season_text: null,
        season_number: null,
        year,
      };
    })();
    const r = await this.$tmdb.search_tv(name);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const list = r.data.list;
    if (list.length === 0) {
      return Result.Ok(null);
    }
    const matched_tv = (() => {
      const matched = list.find((tv) => {
        if (tv.first_air_date && year) {
          if (dayjs(tv.first_air_date).format("YYYY") === year) {
            return true;
          }
        }
        return false;
      });
      if (matched) {
        return matched;
      }
      const matched2 = list.find((tv) => {
        if (tv.name !== null && tv.name === name) {
          return true;
        }
        if (tv.original_name !== null && tv.original_name === name) {
          return true;
        }
        return false;
      });
      if (matched2) {
        return matched2;
      }
      return list[0];
    })();
    const tv_profile_r = await this.cache_tv_profile({ id: Number(matched_tv.id) });
    if (tv_profile_r.error) {
      return Result.Err(tv_profile_r.error.message);
    }
    const { id: series_id, name: series_name, original_name, media_profiles: seasons } = tv_profile_r.data;
    // console.log(name, season_number, year);
    const matched_season = (() => {
      if (season_number === null) {
        const matched = seasons.find((s) => s.order === 1);
        if (matched) {
          return matched;
        }
      }
      const matched = seasons.find((s) => s.order === season_number);
      if (!matched) {
        return seasons[0];
      }
      return matched;
    })();
    const {
      id: season_id,
      name: season_name,
      alias,
      overview,
      poster_path,
      air_date,
      order,
      source_count: episode_count,
      vote_average,
      in_production,
      origin_country,
      genres,
      tmdb_id,
    } = matched_season;
    const episodes = await (async () => {
      if (matched_season.source_profiles.length === 0) {
        const r = await this.cache_season_profile({ tv_id: Number(tv_profile_r.data.tmdb_id), season_number: order });
        if (r.error) {
          return [];
        }
        return r.data.source_profiles;
      }
      return matched_season.source_profiles.map((episode) => {
        const { id, name, overview, air_date, still_path, order, runtime } = episode;
        return {
          id,
          name,
          overview,
          air_date,
          still_path,
          order,
          runtime,
        };
      });
    })();
    const data = {
      id: season_id,
      name: season_name,
      original_name,
      alias,
      overview,
      poster_path,
      air_date,
      order,
      episode_count,
      vote_average,
      in_production,
      origin_country,
      genres,
      platforms: [
        {
          tmdb_id,
        },
      ],
      episodes,
      series: {
        id: tv_profile_r.data.tmdb_id,
        name: series_name,
        original_name: tv_profile_r.data.original_name,
        overview: tv_profile_r.data.overview,
        poster_path: tv_profile_r.data.poster_path,
        air_date: tv_profile_r.data.air_date,
        platforms: [
          {
            tmdb_id: tv_profile_r.data.tmdb_id,
          },
        ],
      },
    };
    return Result.Ok(data);
  }
  /**
   * 调用 TMDB 接口，根据传入的电视剧 tmdb_id 创建电视剧详情记录
   * 保存 tv 及 tv 下的所有 season 详情到数据库
   * 不保存剧集，因为获取 season 只需要调用一次 fetch_tv_profile。保存剧集还需要遍历 season 依次获取详情
   * 如果 season 很多可能太过耗时
   */
  async cache_tv_profile(matched_tv: { id: number | string }) {
    const r1 = await this.$store.prisma.media_series_profile.findFirst({
      where: {
        id: String(matched_tv.id),
      },
      include: {
        media_profiles: {
          include: {
            source_profiles: true,
            origin_country: true,
            genres: true,
          },
        },
        origin_country: true,
        genres: true,
      },
    });
    if (r1 && r1.media_profiles.length) {
      return Result.Ok(r1);
    }
    const r = await this.$tmdb.fetch_tv_profile(matched_tv.id as number);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    return this.create_series_profile({
      ...r.data,
      tmdb_id: String(r.data.id),
    });
  }
  async create_series_profile(
    data: SearchedTVItem & {
      tmdb_id: string | null;
    }
  ) {
    const {
      id,
      name,
      original_name,
      overview,
      poster_path,
      backdrop_path,
      first_air_date,
      number_of_seasons,
      seasons,
      origin_country,
      next_episode_to_air,
      in_production,
      genres,
      tmdb_id,
    } = data;
    const created = await (async () => {
      const existing = await this.$store.prisma.media_series_profile.findFirst({
        where: {
          id: String(id),
          type: MediaTypes.Season,
        },

        include: {
          media_profiles: {
            include: {
              source_profiles: true,
              origin_country: true,
              genres: true,
            },
          },
          origin_country: true,
          genres: true,
        },
      });
      if (existing) {
        return existing;
      }
      const created_series = await this.$store.prisma.media_series_profile.create({
        data: {
          id: String(id),
          type: MediaTypes.Season,
          name,
          original_name: name === original_name ? null : original_name,
          alias: "",
          overview,
          poster_path: await this.download_image(poster_path, "poster_path"),
          backdrop_path: await this.download_image(backdrop_path, "backdrop"),
          air_date: first_air_date,
          tmdb_id,
          origin_country: {
            connectOrCreate: origin_country.map((text) => {
              return {
                where: {
                  id: text,
                },
                create: {
                  id: text,
                  text,
                },
              };
            }),
          },
          genres: {
            connectOrCreate: genres.map((text) => {
              return {
                where: {
                  id: text.id,
                },
                create: {
                  id: text.id,
                  text: text.name,
                },
              };
            }),
          },
        },
        include: {
          media_profiles: {
            include: {
              source_profiles: true,
              origin_country: true,
              genres: true,
            },
          },
          origin_country: true,
          genres: true,
        },
      });
      return created_series;
    })();
    for (let i = 0; i < seasons.length; i += 1) {
      await (async () => {
        const season = seasons[i];
        const {
          name: season_name,
          overview,
          season_number,
          air_date,
          poster_path,
          episode_count,
          vote_average,
        } = season;
        const season_tmdb_id = [created.id, season_number].join("/");
        const existing = await this.$store.prisma.media_profile.findFirst({
          where: {
            id: season_tmdb_id,
          },
          include: {
            source_profiles: true,
            origin_country: true,
            genres: true,
          },
        });
        if (existing) {
          created.media_profiles.push(existing);
          return;
        }
        const created_season = await this.$store.prisma.media_profile.create({
          data: {
            id: season_tmdb_id,
            type: MediaTypes.Season,
            name: format_season_name(season_name, { name }),
            original_name: created.original_name,
            alias: "",
            overview,
            poster_path: await this.download_image(poster_path || created.poster_path, "poster"),
            backdrop_path: await this.download_image(backdrop_path, "backdrop"),
            air_date,
            vote_average: vote_average || undefined,
            order: season_number,
            source_count: episode_count,
            in_production: (() => {
              if (season_number !== number_of_seasons) {
                return 0;
              }
              if (!next_episode_to_air) {
                return 0;
              }
              if (!in_production) {
                return 0;
              }
              return 1;
            })(),
            tmdb_id: season_tmdb_id,
            series_id: created.id,
            origin_country: {
              connectOrCreate: created.origin_country.map((country) => {
                return {
                  where: {
                    id: country.id,
                  },
                  create: {
                    id: country.id,
                    text: country.text,
                  },
                };
              }),
            },
            // genres: {
            //   connectOrCreate: created.genres.map((genre) => {
            //     return {
            //       where: {
            //         id: genre.id,
            //       },
            //       create: {
            //         id: genre.id,
            //         text: genre.text,
            //       },
            //     };
            //   }),
            // },
          },
          include: {
            source_profiles: true,
            origin_country: true,
            genres: true,
          },
        });
        created.media_profiles.push(created_season);
      })();
    }
    return Result.Ok(created);
  }
  /**
   * 获取电视剧季详情
   * 同时创建剧集详情
   */
  async cache_season_profile(body: { tv_id: number | string; season_number: number }) {
    const { tv_id, season_number } = body;
    if (!season_number) {
      return Result.Err("缺少 season_number");
    }
    const season_id = [tv_id, season_number].join("/");
    const existing = await this.$store.prisma.media_profile.findFirst({
      where: {
        id: season_id,
      },
      include: {
        source_profiles: true,
        // origin_country: true,
        // genres: true,
      },
    });
    if (existing) {
      if (existing.source_profiles.length !== 0) {
        return Result.Ok(existing);
      }
    }
    const r = await this.$tmdb.fetch_season_profile({
      tv_id: Number(tv_id),
      season_number,
    });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    await this.apply_episodes(r.data.episodes, {
      tv_id,
      season_id,
      season_number,
    });
    const existing2 = await this.$store.prisma.media_profile.findFirst({
      where: {
        id: season_id,
      },
      include: {
        source_profiles: true,
        // genres: true,
        // origin_country: true,
      },
    });
    if (existing2) {
      return Result.Ok(existing2);
    }
    return Result.Err("未知错误493");
  }
  async apply_episodes(
    episodes: SearchedSeasonProfile["episodes"],
    values: {
      /** media_profile 记录 id */
      season_id: string;
      /** tmdb 查询结果 id */
      tv_id: string | number;
      season_number: number;
    }
  ) {
    const { tv_id, season_id, season_number } = values;
    const episode_records: {
      id: string;
      name: string;
      overview: null | string;
      air_date: null | string;
      still_path: null | string;
      order: number;
      runtime: number;
    }[] = [];
    for (let i = 0; i < episodes.length; i += 1) {
      const { name, overview, air_date, still_path, episode_number, runtime } = episodes[i];
      const episode_tmdb_id = [tv_id, season_number, episode_number].join("/");
      await (async () => {
        const existing = await this.$store.prisma.media_source_profile.findFirst({
          where: {
            id: episode_tmdb_id,
          },
        });
        if (existing) {
          const { id } = existing;
          episode_records.push({
            id,
            name,
            overview,
            air_date,
            still_path,
            order: episode_number,
            runtime: runtime || 0,
          });
          return;
        }
        const created = await this.$store.prisma.media_source_profile.create({
          data: {
            id: episode_tmdb_id,
            name,
            overview,
            still_path,
            order: episode_number,
            air_date,
            runtime,
            tmdb_id: episode_tmdb_id,
            media_profile_id: season_id,
          },
        });
        episode_records.push({
          id: created.id,
          name,
          overview,
          air_date,
          still_path,
          order: episode_number,
          runtime: runtime || 0,
        });
      })();
    }
    return episode_records;
  }
  async search_movie(query: { keyword: string; year: string | null; platform?: string }) {
    const keyword = (() => {
      return [query.keyword, query.year ? `(${query.year})` : null].filter(Boolean).join(" ");
    })();
    if (!keyword) {
      return Result.Err("请传入 keyword");
    }
    const client = new TMDBClient({
      token: this.token,
    });
    const { name, year } = (() => {
      const year_r = /\(([12][0-9][0-9]{2})\)/;
      let year: null | string = null;
      let k = keyword;
      const m1 = k.match(year_r);
      if (m1) {
        year = m1[1];
        k = k.replace(m1[0], "");
      }
      return {
        name: k,
        year,
      };
    })();
    const r = await client.search_movie(name);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const list = r.data.list;
    if (list.length === 0) {
      return Result.Ok(null);
    }
    const matched_movie = (() => {
      const matched = list.find((movie) => {
        if (movie.first_air_date && year) {
          const d = dayjs(movie.first_air_date).format("YYYY");
          if (d === year) {
            return true;
          }
        }
        return false;
      });
      if (matched) {
        return matched;
      }
      const matched2 = list.find((tv) => {
        if (tv.name !== null && tv.name === name) {
          return true;
        }
        if (tv.original_name !== null && tv.original_name === name) {
          return true;
        }
        return false;
      });
      if (matched2) {
        return matched2;
      }
      return list[0];
    })();
    const movie_profile_r = await this.cache_movie_profile(matched_movie);
    if (movie_profile_r.error) {
      return Result.Err(movie_profile_r.error.message);
    }
    const {
      id: movie_id,
      name: movie_name,
      original_name,
      overview,
      alias,
      air_date,
      poster_path,
      vote_average,
      genres,
      origin_country,
      tmdb_id,
    } = movie_profile_r.data;
    return Result.Ok({
      id: movie_id,
      name: movie_name,
      original_name: original_name === movie_name ? null : original_name,
      alias,
      overview,
      poster_path,
      air_date,
      order: 1,
      vote_average,
      in_production: 0,
      genres,
      origin_country,
      platforms: [
        {
          tmdb_id,
        },
      ],
    });
  }
  /**
   * 调用 TMDB 接口，根据传入的电影 tmdb_id 创建电影详情记录
   */
  async cache_movie_profile(matched_movie: { id: string | number }) {
    const existing = await this.$store.prisma.media_profile.findFirst({
      where: {
        id: String(matched_movie.id),
      },
      include: {
        origin_country: true,
        genres: true,
        source_profiles: true,
      },
    });
    if (existing) {
      return Result.Ok(existing);
    }
    const r = await this.$tmdb.fetch_movie_profile(matched_movie.id as number);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { name, original_name, overview, poster_path, backdrop_path, runtime, air_date, origin_country } = r.data;
    const created = await this.$store.prisma.media_profile.create({
      data: {
        id: String(matched_movie.id),
        type: MediaTypes.Movie,
        name,
        original_name,
        alias: "",
        overview,
        poster_path: await this.download_image(poster_path, "poster"),
        backdrop_path: await this.download_image(backdrop_path, "backdrop"),
        air_date,
        order: 1,
        in_production: 0,
        source_count: 1,
        tmdb_id: String(matched_movie.id),
        origin_country: {
          connectOrCreate: origin_country.map((country) => {
            return {
              where: {
                id: country,
              },
              create: {
                id: country,
                text: country,
              },
            };
          }),
        },
        source_profiles: {
          connectOrCreate: [
            {
              where: {
                id: String(matched_movie.id),
              },
              create: {
                id: String(matched_movie.id),
                name,
                original_name,
                overview,
                still_path: null,
                air_date,
                order: 1,
                runtime,
                tmdb_id: String(matched_movie.id),
              },
            },
          ],
        },
      },
      include: {
        source_profiles: true,
        origin_country: true,
        genres: true,
      },
    });
    return Result.Ok(created);
  }
  /** 使用 TDMB 刷新本地影视剧详情 */
  async refresh_media_profile_with_tmdb(media_profile: MediaProfileRecord) {
    const { id, type } = media_profile;
    if (type === MediaTypes.Season) {
      const [tmdb_id, season_number] = id.split("/");
      if (season_number === undefined) {
        return Result.Err("详情 id 不包含 season_number");
      }
      const r = await this.$tmdb.fetch_season_profile({
        tv_id: Number(tmdb_id),
        season_number: Number(season_number),
      });
      if (r.error) {
        return Result.Err(r.error.message);
      }
      const { poster_path, air_date, episodes } = r.data;
      const count = await this.$store.prisma.media_source_profile.count({
        where: {
          media_profile_id: id,
        },
      });
      if (count !== episodes.length) {
        await this.apply_episodes(episodes, {
          tv_id: tmdb_id,
          season_id: id,
          season_number: Number(season_number),
        });
      }
      await walk_model_with_cursor({
        fn: (extra) => {
          return this.$store.prisma.media_source_profile.findMany({
            where: {
              media_profile_id: id,
            },
            ...extra,
          });
        },
        handler: async (data) => {
          const { order, tmdb_id } = data;
          if (tmdb_id) {
            const matched = episodes.find((episode) => {
              return episode.episode_number === order;
            });
            if (!matched) {
              return;
            }
            const { runtime, name, overview, still_path } = matched;
            const payload: Partial<MediaSourceProfileRecord> = {};
            if (runtime && runtime !== data.runtime) {
              payload.runtime = runtime;
            }
            if (name && name !== data.name) {
              payload.name = name;
            }
            if (overview && overview !== data.overview) {
              payload.overview = overview;
            }
            if (still_path && still_path !== data.still_path) {
              payload.still_path = still_path;
            }
            if (Object.keys(payload).length === 0) {
              return;
            }
            await this.$store.prisma.media_source_profile.update({
              where: {
                id: data.id,
              },
              data: payload,
            });
          }
        },
      });
      const payload: Partial<MediaProfileRecord> = {
        updated: dayjs().toDate(),
      };
      if (poster_path && poster_path !== media_profile.poster_path) {
        payload.poster_path = await this.download_image(poster_path, "poster");
      }
      if (!media_profile.air_date && air_date && air_date !== media_profile.air_date) {
        payload.air_date = air_date;
      }
      if (Object.keys(payload).length === 1) {
        return Result.Ok(null);
      }
      const updated_media_profile = await this.$store.prisma.media_profile.update({
        where: {
          id,
        },
        data: payload,
      });
      return Result.Ok(updated_media_profile);
    }
    if (type === MediaTypes.Movie) {
      const tmdb_id = id;
      const r = await this.$tmdb.fetch_movie_profile(Number(tmdb_id));
      if (r.error) {
        return Result.Err(r.error.message);
      }
      const payload: Partial<MediaProfileRecord> = {
        updated: dayjs().toDate(),
      };
      const { poster_path, backdrop_path, air_date } = r.data;
      if (poster_path && poster_path !== media_profile.poster_path) {
        payload.poster_path = await this.download_image(poster_path, "poster");
      }
      if (backdrop_path && backdrop_path !== media_profile.backdrop_path) {
        payload.backdrop_path = await this.download_image(backdrop_path, "backdrop");
      }
      if (air_date && air_date !== media_profile.air_date) {
        payload.air_date = air_date;
      }
      if (Object.keys(payload).length === 1) {
        return Result.Ok(null);
      }
      const updated_media_profile = await this.$store.prisma.media_profile.update({
        where: {
          id,
        },
        data: payload,
      });
      await walk_model_with_cursor({
        fn: (extra) => {
          return this.$store.prisma.media_source_profile.findMany({
            where: {
              media_profile_id: id,
            },
            ...extra,
          });
        },
        handler: async (data) => {
          const { updated } = payload;
          const source_payload: Partial<MediaSourceProfileRecord> = {
            updated,
          };
          const { runtime } = r.data;
          if (runtime && runtime !== data.runtime) {
            source_payload.runtime = runtime;
          }
          if (Object.keys(source_payload).length === 1) {
            return Result.Ok(null);
          }
          await this.$store.prisma.media_source_profile.update({
            where: {
              id,
            },
            data: source_payload,
          });
        },
      });
      return Result.Ok(updated_media_profile);
    }
    return Result.Err("未知类型");
  }
  async refresh_media_source_profile_with_tmdb(media_source_profile: MediaSourceProfileRecord) {
    const { id, type } = media_source_profile;
    if (type === MediaTypes.Season) {
      const [tmdb_id, season_number, episode_number] = id.split("/");
      if (!season_number) {
        return Result.Err("没有季顺序信息");
      }
      if (!episode_number) {
        return Result.Err("没有剧集顺序信息");
      }
      const r = await this.$tmdb.fetch_episode_profile({
        tv_id: Number(tmdb_id),
        season_number: Number(season_number),
        episode_number: Number(episode_number),
      });
      if (r.error) {
        return Result.Err(r.error.message);
      }
      const episode_profile = r.data;
      const { name, air_date, runtime } = episode_profile;
      const payload: Partial<MediaSourceProfileRecord> = {
        updated: dayjs().toDate(),
      };
      if (name && name !== media_source_profile.name) {
        payload.name = name;
      }
      if (air_date && air_date !== media_source_profile.air_date) {
        payload.air_date = air_date;
      }
      if (runtime && runtime !== media_source_profile.runtime) {
        payload.runtime = runtime;
      }
      if (Object.keys(payload).length === 1) {
        return Result.Ok(null);
      }
      await this.$store.prisma.media_source_profile.update({
        where: {
          id,
        },
        data: payload,
      });
    }
    if (type === MediaTypes.Movie) {
      return Result.Err("请使用 refresh_media 刷新电影详情");
    }
    return Result.Err("未知类型");
  }
  async refresh_profile_with_douban(data: MediaProfileRecord & { series: MediaSeriesProfileRecord | null }) {
    const { id, name, order, air_date, series } = data;
    const client = this.$douban;
    const store = this.$store;
    const tips: string[] = [];
    await (async () => {
      const media_name = series ? [series.name, order !== 1 ? order : null].filter(Boolean).join("") : name;
      // const normalize_name = media_name.replace(/ {0,1}第([0-9]{1,})季/, "$1");
      if (series) {
        if (!name.includes(series.name)) {
          const tip = `季名称 '${name}' 没有包含电视剧名称 '${series.name}'`;
          tips.push(tip);
        }
      }
      try {
        const r = await client.search(media_name);
        if (r.error) {
          const tip = `无法根据名称 '${media_name}' 搜索到结果，原因 ${r.error.message}`;
          tips.push(tip);
          return;
        }
        if (data.type === MediaTypes.Season && !series) {
          const tip = `没有关联 series`;
          tips.push(tip);
          return;
        }
        const match_r = this.$douban.match_exact_media(
          {
            type: data.type,
            name: series ? series.name : data.name,
            original_name: data.original_name,
            order: data.order,
            air_date: data.air_date,
          },
          r.data.list
        );
        if (match_r.error) {
          tips.push(match_r.error.message);
          return;
        }
        const matched = match_r.data;
        const r2 = await this.refresh_profile_with_douban_id(data, { douban_id: matched.id });
        if (r2.error) {
          tips.push(r2.error.message);
        }
      } catch (err) {
        const e = err as Error;
        const tip = e.message;
        tips.push(tip);
      }
    })();
    if (tips.length !== 0) {
      await store.prisma.media_profile.update({
        where: {
          id,
        },
        data: {
          tips: tips.join("\n"),
        },
      });
      return Result.Err(tips.join("\n"));
    }
    return Result.Ok(null);
  }
  async refresh_profile_with_douban_id(
    media: MediaProfileRecord & { series: MediaSeriesProfileRecord | null },
    opt: { douban_id: number; override?: number }
  ) {
    const { douban_id } = opt;
    const client = this.$douban;
    const store = this.$store;
    const profile_r = await client.fetch_media_profile(douban_id);
    if (profile_r.error) {
      const tip = `获取详情失败，因为 ${profile_r.error.message}`;
      await store.prisma.media_profile.update({
        where: {
          id: media.id,
        },
        data: {
          tips: tip,
        },
      });
      return Result.Err(tip);
    }
    const profile = profile_r.data;
    console.log("[DOMAIN]media_profile/index - refresh_profile_with_douban_id", profile, media.air_date);
    for (let i = 0; i < profile.genres.length; i += 1) {
      const { id, text } = profile.genres[i];
      const e = await store.prisma.media_genre.findFirst({
        where: {
          id,
        },
      });
      if (!e) {
        await store.prisma.media_genre.create({
          data: {
            id,
            text,
          },
        });
      }
    }
    const persons = [
      ...profile.actors.map((actor) => {
        return {
          ...actor,
          role: "star",
        };
      }),
      ...profile.director.map((actor) => {
        return {
          ...actor,
          role: "director",
        };
      }),
      ...profile.author.map((actor) => {
        return {
          ...actor,
          role: "scriptwriter",
        };
      }),
    ];
    for (let i = 0; i < persons.length; i += 1) {
      const person = persons[i];
      const e = await store.prisma.person_profile.findFirst({
        where: {
          id: person.id,
        },
      });
      if (!e) {
        await store.prisma.person_profile.create({
          data: {
            id: person.id,
            name: person.name,
            douban_id: person.id,
          },
        });
      }
    }
    if (opt.override) {
      await store.prisma.person_in_media.deleteMany({
        where: {
          media_id: media.id,
        },
      });
    }
    for (let i = 0; i < persons.length; i += 1) {
      const person = persons[i];
      await (async () => {
        const e = await store.prisma.person_in_media.findFirst({
          where: {
            name: person.name,
            order: person.order,
            known_for_department: person.role,
            media_id: media.id,
            profile_id: String(person.id),
          },
        });
        if (!e) {
          await store.prisma.person_in_media.create({
            data: {
              id: r_id(),
              name: person.name,
              order: person.order,
              known_for_department: person.role,
              media_id: media.id,
              profile_id: String(person.id),
            },
          });
          return;
        }
      })();
    }
    const payload: Partial<MediaProfileRecord> = {
      douban_id: String(profile.id),
      tips: null,
    };
    if (profile.alias && media.alias !== profile.alias) {
      payload.alias = profile.alias;
    }
    if (!media.air_date && profile.air_date && media.air_date !== profile.air_date) {
      payload.air_date = profile.air_date;
    }
    if (profile.source_count && media.source_count !== profile.source_count) {
      payload.source_count = profile.source_count;
    }
    if (profile.vote_average && media.vote_average !== profile.vote_average) {
      payload.vote_average = profile.vote_average;
    }
    // console.log("add douban_id for media ", name, profile.genres);
    await store.prisma.media_profile.update({
      where: {
        id: media.id,
      },
      data: {
        ...payload,
        genres: {
          set: profile.genres.map((g) => {
            return {
              id: g.id,
            };
          }),
        },
      },
    });
    return Result.Ok(null);
  }
  /** 遍历所有图片，如果是 themoviedb 域名，就下载到本地 */
  async upload_images_in_profile() {
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.$store.prisma.media_profile.findMany({
          where: {
            OR: [
              {
                poster_path: {
                  contains: "movie",
                },
              },
              {
                backdrop_path: {
                  contains: "movie",
                },
              },
            ],
          },
          ...extra,
        });
      },
      handler: async (data) => {
        const { id, poster_path, backdrop_path } = data;
        const payload: {
          poster_path: null | string;
          backdrop_path: null | string;
        } = {
          poster_path: null,
          backdrop_path: null,
        };
        if (poster_path) {
          payload.poster_path = await this.download_image(poster_path, "poster");
        }
        if (poster_path) {
          payload.backdrop_path = await this.download_image(backdrop_path, "backdrop");
        }
        await this.$store.prisma.media_profile.update({
          where: {
            id,
          },
          data: payload,
        });
      },
    });
    await walk_model_with_cursor({
      fn: (extra) => {
        return this.$store.prisma.media_source_profile.findMany({
          where: {
            OR: [
              {
                still_path: {
                  contains: "movie",
                },
              },
            ],
          },
          ...extra,
        });
      },
      handler: async (data) => {
        const { id, still_path } = data;
        const payload: {
          still_path: null | string;
        } = {
          still_path: null,
        };
        if (still_path) {
          payload.still_path = still_path;
        }
        await this.$store.prisma.media_source_profile.update({
          where: {
            id,
          },
          data: payload,
        });
      },
    });
  }
  async download_image(url: string | null, parent_dir: string) {
    if (!url) {
      return null;
    }
    const filename = (() => {
      const segments = url.split("/");
      const name = segments[segments.length - 1];
      if (name.match(/[a-zA-Z0-9]{1,}\.jpg/)) {
        return name;
      }
      return `${r_id()}.jpg`;
    })();
    const img_proxy = "https://proxy.f1x.fun/api/tmdb_site";
    const r = await this.$upload.download(
      url.replace("https://www.themoviedb.org", img_proxy),
      `/${parent_dir}/${filename}`
    );
    if (r.error) {
      return url;
    }
    return r.data;
  }
  /**
   * 针对影视剧详情、海报等信息在云盘中的
   * 由具体的云盘实现来下载该云盘的图片
   */
  async download_image_with_client(values: { file_id: string; key?: string; parent_dir: string; client: DriveClient }) {
    const { file_id, parent_dir, key, client } = values;
    const r = await client.download(file_id);
    if (r.error) {
      // @todo 返回一张默认图片
      console.log("[]1 download_image_with_client failed, because", r.error.message);
      return file_id;
    }
    const { url } = r.data;
    const filename = (() => {
      const segments = url.split("/");
      const name = segments[segments.length - 1];
      if (key) {
        if (key.includes(".")) {
          return key;
        }
        return [key, "jpg"].join(".");
      }
      if (name.length >= 20) {
        return `${file_id}.jpg`;
      }
      if (name.match(/[a-zA-Z0-9]{1,}\.jpg/)) {
        return name;
      }
      return `${r_id()}.jpg`;
    })();
    if (url.startsWith("http")) {
      const r2 = await this.$upload.download(url, `/${parent_dir}/${filename}`);
      if (r2.error) {
        console.log("[]2 download_image_with_client failed, because", r2.error.message);
        return file_id;
      }
      return r2.data;
    }
    // 本地图片
    const r2 = await this.$upload.copy_local_file(url, filename, parent_dir);
    if (r2.error) {
      console.log("[]3 download_image_with_client failed, because", r2.error.message);
      return file_id;
    }
    return r2.data;
  }
}
