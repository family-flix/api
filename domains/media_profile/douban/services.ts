/**
 * @file 豆瓣 api
 */
import fs from "fs";
import path from "path";

import axios from "axios";
// import cheerio from "cheerio";

import { Result, Unpacked, UnpackedResult } from "@/types";
import { DOUBAN_GENRE_TEXT_TO_VALUE } from "@/constants";
// import { query_stringify } from "@/utils";

const API_HOST = "https://frodo.douban.com/api/v2";
export type Language = "zh-CN" | "en-US";
export type RequestCommonPart = {
  api_key?: string;
  language?: string;
};
function fix_TMDB_image_path({
  backdrop_path,
  poster_path,
}: Partial<{
  backdrop_path: null | string;
  poster_path: string | null;
}>) {
  const result: {
    backdrop_path: string | null;
    poster_path: string | null;
  } = {
    backdrop_path: null,
    poster_path: null,
  };
  if (backdrop_path) {
    result.backdrop_path = `https://proxy.funzm.com/api/tmdb_site/t/p/w1920_and_h800_multi_faces${backdrop_path}`;
  }
  if (poster_path) {
    result.poster_path = `https://proxy.funzm.com/api/tmdb_image/t/p/w600_and_h900_bestv2${poster_path}`;
  }
  return result;
}

const client = axios.create({
  baseURL: API_HOST,
  timeout: 6000,
});
type RequestClient = {
  get: <T>(url: string, query?: Record<string, string | number | undefined>) => Promise<Result<T>>;
  post: <T>(url: string, body: Record<string, string | number | undefined>) => Promise<Result<T>>;
};
const request: RequestClient = {
  get: async <T extends null>(endpoint: string, query?: Record<string, string | number | undefined>) => {
    try {
      // const url = `${endpoint}${query ? "?" + query_stringify(query) : ""}`;
      const url = endpoint;
      // console.log("[LOG](request)", "get", API_HOST + url);
      const resp = await client.get(url, {
        params: query,
        headers: {
          Connection: "keep-alive",
          "content-type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.42(0x18002a2d) NetType/WIFI Language/en",
        },
      });
      return Result.Ok<T>(resp.data);
    } catch (err) {
      const error = err as Error;
      return Result.Err(error.message);
    }
  },
  post: async <T>(endpoint: string, body?: Record<string, unknown>) => {
    try {
      // console.log("[LOG](request)", "post", API_HOST + endpoint, body);
      const resp = await client.post(endpoint, body, {
        headers: {
          Connection: "keep-alive",
          "content-type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.42(0x18002a2d) NetType/WIFI Language/en",
        },
      });
      return Result.Ok<T>(resp.data);
    } catch (err) {
      const error = err as Error;
      return Result.Err(error.message);
    }
  },
};

/**
 * tv 列表中的元素
 */
export type PartialSearchedTV = Omit<
  TVProfileItemInDouban,
  "id" | "search_tv_in_tmdb_then_save" | "original_country"
> & {
  id: string;
  created: string;
  updated: string;
};
/**
 * 根据关键字搜索电视剧
 * @param keyword
 */
export async function search_tv_in_douban(keyword: string, options: RequestCommonPart & { page?: number }) {
  const endpoint = `/search/weixin`;
  const { api_key } = options;
  const query = {
    apiKey: api_key,
    q: keyword,
    start: 0,
    count: 10,
  };
  const result = await request.get<{
    count: number;
    items: {
      type_name: "电视剧" | "豆列" | "电影" | "图书" | "音乐";
      target_type: "tv" | "doulist_cards" | "movie" | "book" | "music";
      target: {
        id: string;
        title: string;
        cover_url: string;
        year: string;
        // 产地、演员
        card_subtitle: string;
        rating: {
          count: number;
          max: number;
          star_count: number;
          value: number;
        };
        controversy_reason: string;
        abstract: string;
        // 是否院线上映
        has_linewatch: boolean;
        uri: string;
        null_rating_reason: string;
      };
      layout: string;
    }[];
    total: number;
    start: number;
  }>(endpoint, query);
  const { error, data } = result;
  if (error) {
    return Result.Err(error.message);
  }
  const resp = {
    page: 1,
    total: data.total,
    list: data.items
      .filter((result) => {
        return result.target_type === "tv";
      })
      .map((result) => {
        console.log(result);
        const {
          target: { id, title, cover_url, year, card_subtitle, rating },
        } = result;
        const [origin_country, genre_id, ...actors] = card_subtitle.split("/").map((s) => s.trim());
        return {
          adult: false,
          backdrop_path: null,
          genre_ids: [genre_id],
          origin_country: [origin_country],
          id,
          name: title,
          overview: null,
          poster_path: cover_url,
          first_air_date: year,
          vote_average: rating?.value ?? null,
          vote_count: rating?.count ?? null,
        };
      }),
  };
  return Result.Ok(resp);
}
export type TVProfileItemInDouban = UnpackedResult<Unpacked<ReturnType<typeof search_tv_in_douban>>>["list"][number];

/**
 * 根据关键字搜索电视剧
 * @param keyword
 */
export async function search_movie_in_tmdb(keyword: string, options: RequestCommonPart & { page?: number }) {
  const endpoint = `/search/movie`;
  const { page, api_key } = options;
  const query = {
    api_key,
    query: keyword,
    page,
    include_adult: "false",
  };
  const result = await request.get<{
    page: number;
    total_pages: number;
    total_results: number;
    results: {
      adult: boolean;
      backdrop_path: string;
      genre_ids: number[];
      id: number;
      original_language: string;
      original_title: string;
      overview: string;
      popularity: number;
      poster_path: string;
      release_date: string;
      title: string;
      video: boolean;
      vote_average: number;
      vote_count: number;
    }[];
  }>(endpoint, query);
  // '/search/tv?api_key=XXX&language=zh-CN&query=Modern%20Family&page=1&include_adult=false'
  const { error, data } = result;
  if (error) {
    return Result.Err(error.message);
  }
  const resp = {
    page: data.page,
    total: data.total_results,
    list: data.results.map((result) => {
      const { title, original_title, backdrop_path, poster_path, release_date } = result;
      return {
        ...result,
        name: title,
        original_name: original_title,
        air_date: release_date,
        first_air_date: release_date,
        ...fix_TMDB_image_path({
          backdrop_path,
          poster_path,
        }),
      };
    }),
  };
  return Result.Ok(resp);
}
export type MovieProfileItemInTMDB = UnpackedResult<Unpacked<ReturnType<typeof search_movie_in_tmdb>>>["list"][number];

/**
 * 获取电视剧详情
 */
export async function fetch_media_profile(id: number | undefined, query: RequestCommonPart) {
  if (id === undefined) {
    return Result.Err("请传入电视剧 id");
  }
  const endpoint = `https://movie.douban.com/subject/${id}/`;
  const {} = query;
  const resp = await axios.get<string>(endpoint, {});
  const html = resp.data;
  const fields = html.match(/<div\s+id="info"[^>]*>([\s\S]*?)<\/div>/);
  if (!fields) {
    return Result.Err("匹配不到");
  }
  const content = fields[1];
  const lines = content.split("<br/>");
  const data: {
    name: string | null;
    original_name: string | null;
    overview: string | null;
    source_count: number;
    air_date: string | null;
    genres: string[];
    origin_country: string | null;
    alias: string | null;
    type: "tv" | "movie";
    vote_average: number;
    actors: {
      id: string;
      name: string;
      order: number;
    }[];
    director: {
      id: string;
      name: string;
      order: number;
    }[];
    author: {
      id: string;
      name: string;
      order: number;
    }[];
    IMDb: string | null;
  } = {
    name: null,
    original_name: null,
    overview: null,
    alias: null,
    source_count: 0,
    air_date: null,
    vote_average: 0,
    origin_country: null,
    type: "tv",
    genres: [],
    actors: [],
    director: [],
    author: [],
    IMDb: null,
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] as string;
    if (line.includes("集数")) {
      const r = line.match(/([0-9]{1,})/);
      if (r) {
        data.source_count = Number(r[1]);
      }
    }
    if (line.includes("首播") || line.includes("上映日期")) {
      const r = line.match(/([0-9]{4}-[0-9]{2}-[0-9]{2})/);
      if (r) {
        data.air_date = r[1];
      }
    }
    if (line.includes("上映日期")) {
      data.type = "movie";
    }
    if (line.includes("又名")) {
      const r = line.match(/\/span> {0,1}([\s\S]{1,})$/);
      if (r) {
        data.alias = r[1];
      }
    }
    if (line.includes("制片国家")) {
      const r = line.match(/\/span> {0,1}([\s\S]{1,})$/);
      if (r) {
        data.origin_country = r[1];
      }
    }
    if (line.includes("类型")) {
      const genres = line.match(/<span property="v:genre">([^<]{1,})<\/span>/g);
      if (genres) {
        data.genres = genres
          .map((genre) => {
            const r = genre.match(/>([^<]{1,})</);
            if (r) {
              return r[1];
            }
            return null;
          })
          .filter(Boolean) as string[];
      }
    }
    if (line.includes("IMDb")) {
      const r = line.match(/\/span> {0,1}([\s\S]{1,})$/);
      if (r) {
        data.IMDb = r[1];
      }
    }
    const regexp = `"\/celebrity\/([0-9]{1,})\/"[^>]{0,}>([^<]{1,})<\/a>`;
    const regexp1 = new RegExp(regexp, "g");
    const regexp2 = new RegExp(regexp);
    if (line.includes("主演")) {
      const actors = line.match(regexp1);
      if (actors) {
        data.actors = actors
          .map((actor, i) => {
            const r = actor.match(regexp2);
            if (r) {
              return {
                id: r[1],
                name: r[2],
                order: i + 1,
              };
            }
            return null;
          })
          .filter(Boolean) as {
          id: string;
          name: string;
          order: number;
        }[];
      }
    }
    if (line.includes("导演")) {
      const actors = line.match(regexp1);
      if (actors) {
        data.director = actors
          .map((actor, i) => {
            const r = actor.match(regexp2);
            if (r) {
              return {
                id: r[1],
                name: r[2],
                order: i + 1,
              };
            }
            return null;
          })
          .filter(Boolean) as {
          id: string;
          name: string;
          order: number;
        }[];
      }
    }
    if (line.includes("编剧")) {
      const actors = line.match(regexp1);
      if (actors) {
        data.author = actors
          .map((actor, i) => {
            const r = actor.match(regexp2);
            if (r) {
              return {
                id: r[1],
                name: r[2],
                order: i + 1,
              };
            }
            return null;
          })
          .filter(Boolean) as {
          id: string;
          name: string;
          order: number;
        }[];
      }
    }
  }
  const name_r = html.match(/property="v:itemreviewed">([^<]{1,})</);
  if (name_r) {
    const name = name_r[1];
    const { name: n, origin_name } = (() => {
      const [n, origin_n] = name.split(" ");
      if (origin_n) {
        return { name: n, origin_name: origin_n };
      }
      return {
        name,
        origin_name: null,
      };
    })();
    data.name = n;
    data.original_name = origin_name;
  }
  const overview_r = html.match(/<span property="v:summary"[^>]*>([\s\S]*?)<\/span>/);
  if (overview_r) {
    data.overview = overview_r[1]
      .replace(/<br {0,1}\/>/, "\n")
      .replace(/^\s{1,}|\s{1,}$/, "")
      .trim();
  }
  // fs.writeFileSync(path.join(__dirname, "mock", "profile3.html"), html);
  const rating_r = html.match(/v:average[^>]{1,}>([^<]{1,})</);
  if (rating_r) {
    data.vote_average = Number(rating_r[1]);
  }
  const {
    name,
    original_name,
    overview,
    air_date,
    source_count,
    alias,
    // tagline,
    // status,
    // vote_average,
    // poster_path,
    // backdrop_path,
    // popularity,
    // seasons,
    // number_of_episodes,
    // number_of_seasons,
    genres,
    origin_country,
    actors,
    director,
    author,
    vote_average,
    // in_production,
  } = data;
  return Result.Ok({
    id,
    name,
    original_name,
    air_date,
    overview,
    source_count,
    alias,
    actors,
    director,
    author,
    vote_average,
    // tagline,
    // status,
    // vote_average,
    // popularity,
    // number_of_episodes,
    // number_of_seasons,
    // in_production,
    // ...fix_TMDB_image_path({
    //   poster_path,
    //   backdrop_path,
    // }),
    // seasons: seasons.map((season) => {
    //   const { poster_path } = season;
    //   return {
    //     ...season,
    //     ...fix_TMDB_image_path({ poster_path }),
    //   };
    // }),
    genres: genres
      .map((g) => {
        const v = DOUBAN_GENRE_TEXT_TO_VALUE[g];
        if (!v) {
          return null;
        }
        return {
          id: v,
          text: g,
        };
      })
      .filter(Boolean) as { id: number; text: string }[],
    origin_country,
  });
}
export type TVProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_media_profile>>>;
// export type PartialSeasonFromTMDB = TVProfileFromTMDB["seasons"][number];

/**
 * 获取电视剧某一季详情
 * @link https://developers.themoviedb.org/3/tv/get-tv-details
 * @param number 第几季
 */
export async function fetch_season_profile(
  body: {
    tv_id: number | string;
    season_number: number | undefined;
  },
  options: RequestCommonPart
) {
  const { tv_id, season_number } = body;
  if (season_number === undefined) {
    return Result.Err("请传入季数");
  }
  const endpoint = `/tv/${tv_id}/season/${season_number}`;
  const { api_key } = options;
  const result = await request.get<{
    _id: string;
    air_date: string;
    episodes: {
      air_date: string;
      episode_number: number;
      crew: {
        department: string;
        job: string;
        credit_id: string;
        adult: boolean;
        gender: number;
        id: number;
        known_for_department: string;
        name: string;
        original_name: string;
        popularity: number;
        profile_path: string;
      }[];
      guest_stars: {
        credit_id: string;
        order: number;
        character: string;
        adult: boolean;
        gender: number;
        id: number;
        known_for_department: string;
        name: string;
        original_name: string;
        popularity: number;
        profile_path: string;
      }[];
      id: number;
      name: string;
      overview: string;
      runtime: number;
      production_code: string;
      season_number: number;
      still_path: string;
      vote_average: number;
      vote_count: number;
    }[];
    name: string;
    overview: string;
    id: number;
    poster_path: string;
    season_number: number;
  }>(endpoint, {
    api_key,
    // language,
  });
  if (result.error) {
    if (result.error.message.includes("404")) {
      return Result.Ok(null);
    }
    return Result.Err(result.error);
  }
  const { id, name, overview, air_date, episodes, poster_path } = result.data;
  return Result.Ok({
    id,
    name,
    number: result.data.season_number,
    air_date,
    overview,
    season_number,
    episodes: episodes.map((e) => {
      const { id, air_date, overview, episode_number, season_number, name, runtime } = e;
      return {
        id,
        name,
        overview,
        air_date,
        episode_number,
        season_number,
        runtime,
      };
    }),
    ...fix_TMDB_image_path({
      poster_path,
    }),
  });
}
export type SeasonProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_season_profile>>>;

/**
 * 获取电视剧某一集详情
 * @param number 第几季
 */
export async function fetch_episode_profile(
  body: {
    tv_id: number | string;
    season_number: number | string | undefined;
    episode_number: number | string | undefined;
  },
  option: RequestCommonPart
) {
  const { tv_id, season_number, episode_number } = body;
  if (season_number === undefined) {
    return Result.Err("请传入季数");
  }
  if (episode_number === undefined) {
    return Result.Err("请传入集数");
  }
  const endpoint = `/tv/${tv_id}/season/${season_number}/episode/${episode_number}`;
  const { api_key } = option;
  const result = await request.get<{
    air_date: string;
    episode_number: number;
    name: string;
    overview: string;
    id: number;
    production_code: string;
    runtime: number;
    season_number: number;
    still_path: string;
    vote_average: number;
    vote_count: number;
  }>(endpoint, {
    api_key,
    // language,
  });
  if (result.error) {
    // console.log("find episode in tmdb failed", result.error.message);
    if (result.error.message.includes("404")) {
      return Result.Ok(null);
    }
    return Result.Err(result.error);
  }
  const { id, name, overview, air_date, runtime, episode_number: e_n, season_number: s_n } = result.data;
  return Result.Ok({
    id,
    name,
    air_date,
    overview,
    season_number: s_n,
    episode_number: e_n,
    runtime,
  });
}

export type EpisodeProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_episode_profile>>>;
