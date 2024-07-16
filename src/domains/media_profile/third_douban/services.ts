/**
 * @file 豆瓣 api
 */
import fs from "fs";
import path from "path";

import axios from "axios";
// import cheerio from "cheerio";

import { Result, resultify, UnpackedResult } from "@/domains/result/index";
import { DOUBAN_GENRE_TEXT_TO_VALUE } from "@/constants";
import { Unpacked } from "@/types/index";
// import { query_stringify } from "@/utils";

const API_HOST = "https://frodo.douban.com/api/v2";
export type Language = "zh-CN" | "en-US";
export type RequestCommonPart = {
  api_key?: string;
  language?: string;
};

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
    type,
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
    type,
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
