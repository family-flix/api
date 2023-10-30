/**
 * @file TMDB api
 * @doc https://developer.themoviedb.org/reference/intro/getting-started
 */
import axios from "@/modules/axios";
import { Result, Unpacked, UnpackedResult } from "@/types";
import { query_stringify } from "@/utils";

// const API_HOST = "https://proxy.funzm.com/api/tmdb/3";
const API_HOST = "https://proxy.f1x.fun/api/tmdb/3";
export type Language = "zh-CN" | "en-US";
export type TMDBRequestCommentPart = {
  /** tmdb api key */
  api_key: string;
  /** 语言 */
  language: Language;
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
      const url = `${endpoint}${query ? "?" + query_stringify(query) : ""}`;
      // console.log("[LOG](request)", "get", API_HOST + url);
      const resp = await client.get(url);
      return Result.Ok<T>(resp.data);
    } catch (err) {
      const error = err as Error;
      return Result.Err(error.message);
    }
  },
  post: async <T>(endpoint: string, body?: Record<string, unknown>) => {
    try {
      // console.log("[LOG](request)", "post", API_HOST + endpoint, body);
      const resp = await client.post(endpoint, body);
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
export type PartialSearchedTV = Omit<TVProfileItemInTMDB, "id" | "search_tv_in_tmdb_then_save" | "original_country"> & {
  id: string;
  created: string;
  updated: string;
};
/**
 * 根据关键字搜索电视剧
 * @param keyword
 */
export async function search_tv_in_tmdb(keyword: string, options: TMDBRequestCommentPart & { page?: number }) {
  const endpoint = `/search/tv`;
  const { page, api_key, language } = options;
  const query = {
    api_key,
    language,
    query: keyword,
    page,
    include_adult: "false",
  };
  const result = await request.get<{
    page: number;
    total_pages: number;
    total_results: number;
    results: {
      id: number;
      name?: string;
      /** 原产地名称 */
      original_name: string;
      /** 概述 */
      overview: string;
      /** 海报地址 */
      poster_path?: string;
      /** 详情页背景 */
      backdrop_path?: string;
      media_type?: string;
      /** 首次发布时间 */
      first_air_date?: string;
      /** 标签（如喜剧、恐怖）列表里只返回 id，对应的名称可以继续调用详情接口获取 */
      genre_ids?: number[];
      /** 原产地国家 */
      origin_country?: string[];
      /** 发行语言 */
      original_language?: string;
      popularity?: number;
      /** 评分 */
      vote_average?: number;
      /** 评分总人数 */
      vote_count?: number;
      adult?: boolean;
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
      const { backdrop_path, poster_path } = result;
      return {
        ...result,
        ...fix_TMDB_image_path({
          backdrop_path,
          poster_path,
        }),
      };
    }),
  };
  return Result.Ok(resp);
}
export type TVProfileItemInTMDB = UnpackedResult<Unpacked<ReturnType<typeof search_tv_in_tmdb>>>["list"][number];

/**
 * 根据关键字搜索电视剧
 * @param keyword
 */
export async function search_movie_in_tmdb(keyword: string, options: TMDBRequestCommentPart & { page?: number }) {
  const endpoint = `/search/movie`;
  const { page, api_key, language } = options;
  const query = {
    api_key,
    language,
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
 * @link https://developers.themoviedb.org/3/tv/get-tv-details
 * @param id 电视剧 tmdb id
 */
export async function fetch_tv_profile(
  id: number | undefined,
  query: {
    api_key: string;
    language?: Language;
  }
) {
  if (id === undefined) {
    return Result.Err("请传入电视剧 id");
  }
  const endpoint = `/tv/${id}`;
  const { api_key, language } = query;
  const r = await request.get<{
    backdrop_path: string | null;
    created_by: {
      id: number;
      credit_id: string;
      name: string;
      gender: number;
      profile_path: string;
    }[];
    episode_run_time: number[];
    first_air_date: string;
    genres: {
      id: number;
      name: string;
    }[];
    homepage: string;
    id: number;
    in_production: boolean;
    languages: string[];
    last_air_date: string;
    last_episode_to_air: {
      air_date: string;
      episode_number: number;
      id: number;
      name: string;
      overview: string;
      production_code: string;
      season_number: number;
      still_path: string;
      vote_average: number;
      vote_count: number;
    };
    name: string | null;
    next_episode_to_air: null;
    networks: {
      name: string;
      id: number;
      logo_path: string;
      origin_country: string;
    }[];
    number_of_episodes: number;
    number_of_seasons: number;
    origin_country: string[];
    original_language: string;
    original_name: string | null;
    overview: string | null;
    popularity: number;
    poster_path: string | null;
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
    seasons: {
      air_date: string;
      episode_count: number;
      id: number;
      name: string;
      overview: string;
      poster_path: string;
      season_number: number;
      vote_average: number;
    }[];
    spoken_languages: {
      english_name: string;
      iso_639_1: string;
      name: string;
    }[];
    /** 状态 Ended|Canceled|Returning Series */
    status: string;
    /** 一句话说明 */
    tagline: string;
    type: string;
    vote_average: number;
    vote_count: number;
  }>(endpoint, {
    api_key,
    language,
  });
  if (r.error) {
    return Result.Err(r.error);
  }
  const {
    name,
    original_name,
    overview,
    first_air_date,
    tagline,
    status,
    vote_average,
    poster_path,
    backdrop_path,
    popularity,
    seasons,
    number_of_episodes,
    number_of_seasons,
    in_production,
  } = r.data;
  return Result.Ok({
    id,
    name,
    original_name,
    first_air_date,
    overview,
    tagline,
    status,
    vote_average,
    popularity,
    number_of_episodes,
    number_of_seasons,
    in_production,
    ...fix_TMDB_image_path({
      poster_path,
      backdrop_path,
    }),
    seasons: seasons.map((season) => {
      const { poster_path } = season;
      return {
        ...season,
        ...fix_TMDB_image_path({ poster_path }),
      };
    }),
    genres: r.data.genres,
    origin_country: r.data.origin_country,
  });
}
export type TVProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_tv_profile>>>;
export type PartialSeasonFromTMDB = TVProfileFromTMDB["seasons"][number];

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
  options: {
    api_key: string;
    language?: Language;
  }
) {
  const { tv_id, season_number } = body;
  if (season_number === undefined) {
    return Result.Err("请传入季数");
  }
  const endpoint = `/tv/${tv_id}/season/${season_number}`;
  const { api_key, language } = options;
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
    language,
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
  option: {
    api_key: string;
    language?: Language;
  }
) {
  const { tv_id, season_number, episode_number } = body;
  if (season_number === undefined) {
    return Result.Err("请传入季数");
  }
  if (episode_number === undefined) {
    return Result.Err("请传入集数");
  }
  const endpoint = `/tv/${tv_id}/season/${season_number}/episode/${episode_number}`;
  const { api_key, language } = option;
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
    language,
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
export async function fetch_movie_profile(
  id: number | undefined,
  query: {
    api_key: string;
    language?: Language;
  }
) {
  if (id === undefined) {
    return Result.Err("请传入电影 id");
  }
  const endpoint = `/movie/${id}`;
  const { api_key, language } = query;
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
    language,
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
    ...fix_TMDB_image_path({
      poster_path,
      backdrop_path,
    }),
  });
}
export type MovieProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_movie_profile>>>;
