/**
 * @file TMDB api
 * @doc https://developer.themoviedb.org/reference/intro/getting-started
 */
import { SearchedMovieItem, SearchedTVItem } from "@/domains/media_profile/types";
import { request_factory, TmpRequestResp } from "@/domains/request/utils";
import { Result, UnpackedResult } from "@/domains/result/index";
import { Unpacked } from "@/types/index";
import { MEDIA_SOURCE_MAP } from "@/constants/index";

export type Language = "zh-CN" | "en-US";
type TMDBRequestCommentPart = {
  /** tmdb api key */
  api_key: string;
  /** 语言 */
  language: Language;
};
type TMDBImagePaths = {
  backdrop_path?: string | null;
  poster_path?: string | null;
  profile_path?: string | null;
  still_path?: string | null;
};
type FixedTMDBImagePaths<T extends TMDBImagePaths> = {
  // [K in keyof T as Exclude<K, "backdrop_path" | "poster_path" | "profile_path" | "still_path">]?: never;
  // Include only the keys that are present in T and map their types to non-null strings
  [P in keyof T as P extends "backdrop_path" | "poster_path" | "profile_path" | "still_path"
    ? T[P] extends null | undefined
      ? never
      : P
    : never]: T[P] extends null | undefined ? never : string;
};
function fix_TMDB_image_path<T extends TMDBImagePaths>(values: T): FixedTMDBImagePaths<T> {
  const { backdrop_path, poster_path, profile_path, still_path } = values;
  const result: any = {
    backdrop_path: null,
    poster_path: null,
    profile_path: null,
    still_path: null,
  };
  if (backdrop_path) {
    result.backdrop_path = `https://www.themoviedb.org/t/p/w1920_and_h800_multi_faces${backdrop_path}`;
  }
  if (poster_path) {
    result.poster_path = `https://www.themoviedb.org/t/p/w600_and_h900_bestv2${poster_path}`;
  }
  if (profile_path) {
    result.profile_path = `https://www.themoviedb.org/t/p/w600_and_h900_bestv2${profile_path}`;
  }
  if (still_path) {
    result.still_path = `https://www.themoviedb.org/t/p/w227_and_h127_bestv2${still_path}`;
  }
  return result as FixedTMDBImagePaths<T>;
}

export const request = request_factory({
  hostnames: {
    prod: "https://proxy.f2x.fun/api/tmdb/3",
    // prod: "https://api.themoviedb.org/3",
  },
});

/**
 * tv 列表中的元素
 */
// type PartialSearchedTV = Omit<TVProfileItemInTMDB, "id" | "search_tv_in_tmdb_then_save" | "original_country"> & {
//   id: string;
//   created: string;
//   updated: string;
// };
/**
 * 根据关键字搜索电视剧
 * @param keyword
 */
export function search_tv(options: TMDBRequestCommentPart & { keyword: string; page?: number }) {
  const { keyword } = options;
  console.log("[SERVICE]/media_profile/tmdb_v2/service - search_tv", keyword);
  const endpoint = "/search/tv";
  const { page, api_key, language } = options;
  const query = {
    api_key,
    language,
    query: keyword,
    page,
    include_adult: "false",
  };
  return request.get<{
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
}
export function search_tv_process(r: TmpRequestResp<typeof search_tv>) {
  // '/search/tv?api_key=XXX&language=zh-CN&query=Modern%20Family&page=1&include_adult=false'
  const { error, data } = r;
  if (error) {
    return Result.Err(error.message);
  }
  const resp = {
    page: data.page,
    total: data.total_results,
    list: data.results.map((result) => {
      const {
        id,
        name,
        original_name,
        overview,
        backdrop_path,
        poster_path,
        first_air_date,
        origin_country = [],
        genre_ids = [],
      } = result;
      return {
        id,
        name,
        original_name,
        overview,
        ...fix_TMDB_image_path({
          backdrop_path,
          poster_path,
        }),
        first_air_date,
        origin_country,
        type: "tv",
        source: MEDIA_SOURCE_MAP["tmdb"],
      } as SearchedTVItem;
    }),
  };
  return Result.Ok(resp);
}
// export type TVProfileItemInTMDB = UnpackedResult<Unpacked<ReturnType<typeof search_tv>>>["list"][number];

/**
 * 根据关键字搜索电视剧
 * @param keyword
 */
export function search_movie(keyword: string, options: TMDBRequestCommentPart & { page?: number }) {
  console.log("[SERVICE]/media_profile/tmdb_v2/service - search_movie", keyword);
  const endpoint = "/search/movie";
  const { page, api_key, language } = options;
  const query = {
    api_key,
    language,
    query: keyword,
    page,
    include_adult: "false",
  };
  return request.get<{
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
}
export function search_movie_process(r: TmpRequestResp<typeof search_movie>) {
  // '/search/tv?api_key=XXX&language=zh-CN&query=Modern%20Family&page=1&include_adult=false'
  const { error, data } = r;
  if (error) {
    return Result.Err(error.message);
  }
  const resp = {
    page: data.page,
    total: data.total_results,
    list: data.results.map((result) => {
      const { id, title, original_title, overview, backdrop_path, poster_path, release_date, genre_ids = [] } = result;
      return {
        id,
        name: title,
        original_name: original_title,
        overview,
        air_date: release_date,
        first_air_date: release_date,
        genre_ids,
        origin_country: [],
        ...fix_TMDB_image_path({
          backdrop_path,
          poster_path,
        }),
        type: "movie",
        source: MEDIA_SOURCE_MAP["tmdb"],
      } as SearchedMovieItem;
    }),
  };
  return Result.Ok(resp);
}
// export type MovieProfileItemInTMDB = UnpackedResult<Unpacked<ReturnType<typeof search_movie_in_tmdb>>>["list"][number];

/**
 * 获取电视剧详情
 * @link https://developers.themoviedb.org/3/tv/get-tv-details
 * @param id 电视剧 tmdb id
 */
export function fetch_tv_profile(
  id: number,
  query: {
    api_key: string;
    language?: Language;
  }
) {
  console.log("[SERVICE]/media_profile/tmdb_v2/service - fetch_tv_profile");
  // if (id === undefined) {
  //   return Result.Err("请传入电视剧 id");
  // }
  const endpoint = `/tv/${id}`;
  const { api_key, language } = query;
  return request.get<{
    backdrop_path: string | null;
    created_by: {
      id: number;
      credit_id: string;
      name: string;
      gender: number;
      profile_path: string;
    }[];
    episode_run_time: number[];
    first_air_date: string | null;
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
    next_episode_to_air: string | null;
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
      id: number;
      air_date: string;
      episode_count: number;
      name: string;
      overview: string | null;
      poster_path: string | null;
      season_number: number;
      vote_average: number | null;
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
    vote_average: number | null;
    vote_count: number;
  }>(endpoint, {
    api_key,
    language,
  });
}
// export type TVProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_tv_profile>>>;
// export type PartialSeasonFromTMDB = TVProfileFromTMDB["seasons"][number];
export function fetch_tv_profile_process(r: TmpRequestResp<typeof fetch_tv_profile>) {
  if (r.error) {
    return Result.Err(r.error);
  }
  const {
    id,
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
    next_episode_to_air,
  } = r.data;
  const result: SearchedTVItem = {
    id,
    name: (name || original_name)!,
    original_name,
    first_air_date,
    overview,
    // tagline,
    // status,
    vote_average,
    popularity,
    number_of_episodes,
    number_of_seasons,
    in_production,
    next_episode_to_air,
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
    type: "tv",
    source: "tmdb",
  };
  return Result.Ok(result);
}

/**
 * 获取电视剧某一季详情
 * @link https://developers.themoviedb.org/3/tv/get-tv-details
 * @param number 第几季
 */
export function fetch_season_profile(
  body: {
    tv_id: number | string;
    season_number: number | undefined;
  },
  options: {
    api_key: string;
    language?: Language;
  }
) {
  // console.log("[SERVICE]fetch_season_profile_in_tmdb_v2", body.tv_id, body.season_number);
  console.log("[SERVICE]/media_profile/tmdb_v2/service - fetch_season_profile");
  const { tv_id, season_number } = body;
  // if (season_number === undefined) {
  //   return Result.Err("请传入季数");
  // }
  const endpoint = `/tv/${tv_id}/season/${season_number}`;
  const { api_key, language } = options;
  return request.get<{
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
}
export function fetch_season_profile_process(r: TmpRequestResp<typeof fetch_season_profile>) {
  if (r.error) {
    // console.log("find season in tmdb failed", result.error.message);
    if (r.error.message.includes("404")) {
      return Result.Ok(null);
    }
    return Result.Err(r.error);
  }
  const { id, name, overview, air_date, episodes, poster_path, season_number } = r.data;
  return Result.Ok({
    id,
    name,
    number: season_number,
    air_date,
    overview,
    season_number,
    episodes: episodes.map((e) => {
      const { id, air_date, overview, episode_number, season_number, still_path, name, runtime } = e;
      return {
        id,
        name,
        overview,
        air_date,
        episode_number,
        season_number,
        runtime,
        ...fix_TMDB_image_path({
          still_path,
        }),
      };
    }),
    ...fix_TMDB_image_path({
      poster_path,
    }),
  });
}
export type TVProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_tv_profile_process>>>;
export type PartialSeasonFromTMDB = TVProfileFromTMDB["seasons"][number];

/**
 * 获取电视剧某一集详情
 * @param number 第几季
 */
export function fetch_episode_profile(
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
  // if (season_number === undefined) {
  //   return Result.Err("请传入季数");
  // }
  // if (episode_number === undefined) {
  //   return Result.Err("请传入集数");
  // }
  const endpoint = `/tv/${tv_id}/season/${season_number}/episode/${episode_number}`;
  const { api_key, language } = option;
  return request.get<{
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
}
export type EpisodeProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_episode_profile_process>>>;
export function fetch_episode_profile_process(r: TmpRequestResp<typeof fetch_episode_profile>) {
  if (r.error) {
    // console.log("find episode in tmdb failed", result.error.message);
    if (r.error.message.includes("404")) {
      return Result.Ok(null);
    }
    return Result.Err(r.error);
  }
  const { id, name, overview, air_date, runtime, episode_number: e_n, season_number: s_n } = r.data;
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
/**
 * 获取电视剧详情
 * @link https://developers.themoviedb.org/3/tv/get-tv-details
 * @param id 电视剧 tmdb id
 */
export function fetch_movie_profile(
  id: number | undefined,
  query: {
    api_key: string;
    language?: Language;
  }
) {
  // if (id === undefined) {
  //   return Result.Err("请传入电影 id");
  // }
  const endpoint = `/movie/${id}`;
  const { api_key, language } = query;
  return request.get<{
    adult: boolean;
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
    original_title: string | null;
    overview: string | null;
    popularity: number;
    poster_path: string | null;
    backdrop_path: string | null;
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
    release_date: string | null;
    revenue: number;
    runtime: number | null;
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
}
export type MovieProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_movie_profile_process>>>;
export function fetch_movie_profile_process(r: TmpRequestResp<typeof fetch_movie_profile>) {
  if (r.error) {
    return Result.Err(r.error);
  }
  const {
    id,
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
    name: title,
    original_name: original_title,
    air_date: release_date,
    overview,
    // tagline,
    status,
    vote_average,
    popularity,
    genres: r.data.genres,
    runtime,
    origin_country: r.data.production_countries.map((country) => {
      return country["iso_3166_1"];
    }),
    ...(fix_TMDB_image_path({
      poster_path,
      backdrop_path,
    }) as {
      poster_path: string | null;
      backdrop_path: string | null;
    }),
  });
}

type DepartmentTypes =
  | "Acting"
  | "Directing"
  | "Camera"
  | "Crew"
  | "Production"
  | "Sound"
  | "Writing"
  | "Creator"
  | "Art"
  | "Visual Effects";

export function fetch_persons_of_season(
  body: {
    tv_id: number | string;
    season_number: number | string | undefined;
  },
  option: {
    api_key: string;
    language?: Language;
  }
) {
  const { tv_id, season_number } = body;
  // if (season_number === undefined) {
  //   return Result.Err("请传入季数");
  // }
  const endpoint = `/tv/${tv_id}/season/${season_number}/credits`;
  const { api_key, language } = option;
  return request.get<{
    /** 演员列表 */
    cast: {
      adult: boolean;
      /** 性别 */
      gender: 1 | 2;
      id: number;
      /** 演员/导演等 */
      known_for_department: DepartmentTypes;
      /** 名称 */
      name: string;
      /** 英文名称 */
      original_name: string;
      popularity: number;
      /** 头像地址 */
      profile_path: string;
      /** 剧中角色名称 */
      character: string;
      credit_id: string;
      /** 顺序 */
      order: number;
    }[];
    /** 其他工作人员 */
    crew: {
      adult: boolean;
      gender: number;
      id: number;
      known_for_department: DepartmentTypes;
      name: string;
      original_name: string;
      popularity: number;
      profile_path: string;
      credit_id: string;
      /** 部门 */
      department: string;
      /** 工作内容 */
      job: string;
      order: number;
    }[];
    id: number;
  }>(endpoint, {
    api_key,
    language,
  });
}
export function fetch_persons_of_season_process(r: TmpRequestResp<typeof fetch_persons_of_season>) {
  if (r.error) {
    return Result.Err(r.error);
  }
  const { id, cast, crew } = r.data;
  return Result.Ok(
    [...cast, ...crew].map((person) => {
      const { id, name, gender, known_for_department, profile_path, order = 9999 } = person;
      return {
        id,
        name,
        gender,
        profile_path,
        known_for_department,
        order,
      };
    })
  );
}
export function fetch_persons_of_movie(
  body: {
    movie_id: number | string;
  },
  option: {
    api_key: string;
    language?: Language;
  }
) {
  const { movie_id } = body;
  const endpoint = `/movie/${movie_id}/credits`;
  const { api_key, language } = option;
  return request.get<{
    /** 演员列表 */
    cast: {
      adult: boolean;
      /** 性别 */
      gender: 1 | 2;
      id: number;
      /** 演员/导演等 */
      known_for_department: DepartmentTypes;
      /** 名称 */
      name: string;
      /** 英文名称 */
      original_name: string;
      popularity: number;
      /** 头像地址 */
      profile_path: string;
      /** 剧中角色名称 */
      character: string;
      credit_id: string;
      /** 顺序 */
      order: number;
    }[];
    /** 其他工作人员 */
    crew: {
      adult: boolean;
      gender: number;
      id: number;
      known_for_department: DepartmentTypes;
      name: string;
      original_name: string;
      popularity: number;
      profile_path: string;
      credit_id: string;
      /** 部门 */
      department: string;
      /** 工作内容 */
      job: string;
      order: number;
    }[];
    id: number;
  }>(endpoint, {
    api_key,
    language,
  });
}
export function fetch_persons_of_movie_process(r: TmpRequestResp<typeof fetch_persons_of_movie>) {
  if (r.error) {
    return Result.Err(r.error);
  }
  const { id, cast, crew } = r.data;
  return Result.Ok(
    [...cast, ...crew].map((person) => {
      const { id, name, gender, known_for_department, profile_path, order = 9999 } = person;
      return {
        id,
        name,
        gender,
        profile_path,
        known_for_department,
        order,
      };
    })
  );
}
export function fetch_person_profile(
  body: {
    person_id: number | string;
  },
  option: {
    api_key: string;
    language?: Language;
  }
) {
  const { person_id } = body;
  // if (person_id === undefined) {
  //   return Result.Err("请传入 person_id");
  // }
  const endpoint = `/person/${person_id}`;
  const { api_key, language } = option;
  return request.get<{
    adult: boolean;
    also_known_as: DepartmentTypes[];
    biography: string;
    birthday: string;
    deathday: null;
    gender: number;
    homepage: null;
    id: number;
    imdb_id: string;
    known_for_department: DepartmentTypes;
    name: string;
    place_of_birth: string;
    popularity: number;
    profile_path: string;
  }>(endpoint, {
    api_key,
    language,
  });
}
export function fetch_person_profile_process(r: TmpRequestResp<typeof fetch_person_profile>) {
  if (r.error) {
    return Result.Err(r.error);
  }
  const { id, name, also_known_as, known_for_department, biography, profile_path, place_of_birth, birthday } = r.data;
  return Result.Ok({
    id,
    name: (() => {
      const find_chinese = (() => {
        if (!place_of_birth) {
          return false;
        }
        if (place_of_birth.match(/China|中国|Hong Kong|Taiwan/)) {
          return true;
        }
      })();
      if (!find_chinese) {
        return name;
      }
      const chinese_name = also_known_as
        .map((n) => n.trim())
        .find((n) => {
          if (n.match(/^[\u4e00-\u9fa5]{1,}$/)) {
            return true;
          }
        });
      if (chinese_name) {
        return chinese_name;
      }
      return name;
    })(),
    biography,
    profile_path: fix_TMDB_image_path({ profile_path }).profile_path,
    place_of_birth,
    birthday,
    known_for_department,
  });
}
