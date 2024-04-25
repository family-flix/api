/**
 * @file 豆瓣 api
 * @doc https://m.mgtv.com/h/458367/16949844.html
 */
import axios from "axios";
import dayjs from "dayjs";

import { Result, Unpacked, UnpackedResult } from "@/types";
import { MEDIA_SOURCE_MAP, MEDIA_TYPE_MAP, MEDIA_COUNTRY_MAP } from "@/constants";

import { SearchedTVItem } from "../types";

export type Language = "zh-CN" | "en-US";
export type RequestCommonPart = {
  api_key?: string;
};

const client = axios.create({
  timeout: 6000,
});
type RequestClient = {
  get: <T>(url: string, query?: Record<string, string | number | undefined>) => Promise<Result<T>>;
  post: <T>(url: string, body: Record<string, string | number | undefined>) => Promise<Result<T>>;
};
const request: RequestClient = {
  get: async <T extends null>(endpoint: string, query?: Record<string, string | number | undefined>) => {
    try {
      const url = endpoint;
      const resp = await client.get(url, {
        params: query,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.43(0x18002b2c) NetType/WIFI Language/zh_CN",
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
      const resp = await client.post(endpoint, body, {
        headers: {},
      });
      return Result.Ok<T>(resp.data);
    } catch (err) {
      const error = err as Error;
      return Result.Err(error.message);
    }
  },
};

/**
 * 根据关键字搜索电视剧
 * @param keyword
 */
export async function search_media_in_mgtv(keyword: string, options: RequestCommonPart & { page?: number } = {}) {
  const endpoint = "https://mobileso.bz.mgtv.com/msite/search/v2";
  const query = {
    q: keyword,
  };
  const result = await request.get<{
    code: number;
    cost: number;
    data: {
      contents: {
        type: string;
        idx: number;
        name: string;
        data: {
          title: string;
          desc: string;
          img: string;
          url: string;
          source: string;
        }[];
      }[];
    };
  }>(endpoint, query);
  const { error, data } = result;
  if (error) {
    return Result.Err(error.message);
  }
  const medias = data.data.contents.filter((c) => {
    return c.type === "media";
  });
  if (medias.length === 0) {
    return Result.Err("结构中没有 contents 字段");
  }
  return Result.Ok({
    list: medias.map((media, i) => {
      const { data } = media;
      const { url, title, img, desc, source } = data[0];
      const [genres_text, origin_country, air_date = null] = desc[0].split("/").map((s) => s.trim());
      return {
        id: url.startsWith("http") ? url : `https://m.mgtv.com${url}`,
        name: title.replace(/<\/{0,1}B>/g, ""),
        original_name: null,
        overview: null,
        poster_path: img,
        backdrop_path: null,
        first_air_date: air_date,
        origin_country: [origin_country]
          .map((c) => {
            return MEDIA_COUNTRY_MAP[c];
          })
          .filter(Boolean),
        type: MEDIA_TYPE_MAP[genres_text.replace(/类型: /, "")],
        source: MEDIA_SOURCE_MAP[source],
      } as SearchedTVItem;
    }),
  });
}

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
        backdrop_path,
        poster_path,
      };
    }),
  };
  return Result.Ok(resp);
}
export type MovieProfileItemInTMDB = UnpackedResult<Unpacked<ReturnType<typeof search_movie_in_tmdb>>>["list"][number];

/**
 * 获取季下所有剧集
 */
export async function fetch_episodes_of_season_in_mgtv(body: { tv_id: string | number; season_number: number }) {
  const endpoint = "https://v5m.api.mgtv.com/remaster/vrs/getVideoListByPartId";
  const r = await request.get<string>(endpoint, {
    partId: "",
    pageNum: 1,
    pageSize: 1,
  });
  if (r.error) {
    return Result.Err(r.error);
  }
}

/**
 * 获取电视剧详情
 */
export async function fetch_tv_profile_in_mgtv(id: string | number, query: RequestCommonPart) {
  if (id === undefined) {
    return Result.Err("请传入电视剧 id");
  }
  const endpoint = `${id}`;
  const { api_key } = query;
  const r = await request.get<string>(endpoint, {
    api_key,
  });
  if (r.error) {
    return Result.Err(r.error);
  }
  const data = r.data;
  const json_r = /window.__INITIAL_STATE__=([^<]{1,})</;
  const json: {
    route: {};
    nav: {
      navList: {}[];
    };
    playPage: {
      videoinfo: {
        /** 类型 */
        0: string;
        /** 地区 */
        1: string;
        /** 电视台 */
        2: string;
        3: string;
        /** 主持人 */
        4: string;
        /** 嘉宾 */
        5: string;
        /** 简介 */
        6: string;
        /** 电视剧 id */
        seriesId: string;
        /** 电视剧名称 */
        seriesName: string;
        image: string;
        intro: string[];
        /** 是否更新？ */
        clipStatus: number;
        clipName: string;
        /** 季 id */
        clipId: string;
        videoIndex: number;
        /** 季列表 */
        series: {
          seasonId: number;
          clipId: number;
          title: string;
        }[];
      };
      fullVideoListInfo: { list: {}[] };
    };
  } | null = (() => {
    try {
      const j = data.match(json_r);
      if (!j) {
        return null;
      }
      const r = JSON.parse(j[1]);
      return r;
    } catch (err) {
      return null;
    }
  })();
  if (json === null) {
    return Result.Err("解析失败1");
  }
  const info = json.playPage.videoinfo;
  return Result.Ok({
    id,
    /** 中文片名 */
    name: info.clipName || info.seriesName,
    /** 中文简介 */
    overview: info["6"]?.replace(/简介：/, "") ?? null,
    poster_path: info.image,
    backdrop_path: null,
    /** 产地片名 */
    original_name: null,
    seasons: [
      {
        // air_date: (() => {
        //   if (!episode) {
        //     return null;
        //   }
        //   return String(episode.dataNode[0].data.stage).replace(/([0-9]{4})([0-9]{2})([0-9]{2})/, "$1-$2-$3");
        // })(),
        // episode_count: json.videoMap.episodeTotal,
        // name: name_and_season.season ?? null,
        // overview: desc,
        // poster_path: info.data.img,
        // season_number: (() => {
        //   if (!name_and_season.season) {
        //     return null;
        //   }
        //   const r1 = name_and_season.season.match(/[0-9]{1,}/);
        //   if (!r1) {
        //     return null;
        //   }
        //   return Number(r1[0]);
        // })(),
        vote_average: 0,
        // episodes: episode
        //   ? episode.dataNode.map((e, i) => {
        //       const { img, title, stage } = e.data;
        //       return {
        //         name: title,
        //         air_date: String(stage).replace(/([0-9]{4})([0-9]{2})([0-9]{2})/, "$1-$2-$3"),
        //         episode_number: i + 1,
        //         thumbnail: img,
        //       };
        //     })
        //   : [],
      },
    ],
    // in_production: json.videoMap.completed,
    first_air_date: (() => {
      return null;
    })(),
    vote_average: 0,
    popularity: 0,
    // number_of_episodes: json.videoMap.episodeTotal,
    number_of_seasons: 1,
    status: null,
    // genres: info.data.showGenre
    //   .split(" ")
    //   .map((t) => t.trim())
    //   .map((t) => {
    //     return {
    //       id: t,
    //       name: t,
    //     };
    //   }),
    // origin_country: info.data.area
    //   .map((area) => {
    //     return MGTV_ORIGIN_COUNTRY_MAP[area];
    //   })
    //   .filter(Boolean),
  });
}

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
  });
  if (result.error) {
    // console.log("find season in tmdb failed", result.error.message);
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
    poster_path,
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

/**
 * 获取电视剧详情
 * @link https://developers.themoviedb.org/3/tv/get-tv-details
 * @param id 电视剧 tmdb id
 */
export async function fetch_movie_profile(id: number | undefined, query: RequestCommonPart) {
  if (id === undefined) {
    return Result.Err("请传入电影 id");
  }
  const endpoint = `/movie/${id}`;
  const { api_key } = query;
  const r = await request.get<{
    adult: boolean;
    backdrop_path: string;
    belongs_to_collection: {
      id: number;
      name: string;
      poster_path: string;
      backdrop_path: string;
    };
    budget: number;
    genres: {
      id: number;
      name: string;
    }[];
    homepage: string;
    id: number;
    imdb_id: string;
    original_language: string;
    original_title: string;
    overview: string;
    popularity: number;
    poster_path: string;
    production_companies: {
      id: number;
      logo_path: string;
      name: string;
      origin_country: string;
    }[];
    production_countries: {
      iso_3166_1: string;
      name: string;
    }[];
    release_date: string;
    revenue: number;
    runtime: number;
    spoken_languages: {
      english_name: string;
      iso_639_1: string;
      name: string;
    }[];
    status: string;
    tagline: string;
    title: string;
    video: boolean;
    vote_average: number;
    vote_count: number;
  }>(endpoint, {
    api_key,
  });
  if (r.error) {
    return Result.Err(r.error);
  }
  const {
    overview,
    tagline,
    status,
    title,
    original_title,
    vote_average,
    release_date,
    poster_path,
    backdrop_path,
    popularity,
    runtime,
  } = r.data;
  return Result.Ok({
    id,
    title,
    original_title,
    name: title,
    original_name: original_title,
    air_date: release_date,
    release_date,
    overview,
    tagline,
    status,
    vote_average,
    popularity,
    genres: r.data.genres,
    runtime,
    origin_country: r.data.production_countries.map((country) => {
      return country["iso_3166_1"];
    }),
    poster_path,
    backdrop_path,
  });
}
export type MovieProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_movie_profile>>>;
