export type MediaId = string | number;

export type SearchedTVItem = {
  id: number | string;
  name: string | null;
  original_name: string | null;
  first_air_date: string | null;
  overview: string | null;
  //   tagline;
  //   status;
  //   number_of_episodes: number;
  //   number_of_seasons: number;
  //   in_production: number;
  poster_path: string | null;
  backdrop_path: string | null;
  //   seasons: {
  //     id: MediaId;
  //     name: string;
  //     poster_path: string | null;
  //     overview: string | null;
  //     air_date: string | null;
  //   }[];
  //   genres: string[];
  origin_country: string[];
  type: "tv" | "movie";
  source: "qq" | "iqiyi" | "mgtv" | "youku";
};

export type SearchedMovieItem = {
  id: number | string;
  name: string | null;
  original_name: string | null;
  first_air_date: string | null;
  overview: string | null;
  //   tagline;
  //   status;
  //   number_of_episodes: number;
  //   number_of_seasons: number;
  //   in_production: number;
  poster_path: string | null;
  backdrop_path: string | null;
  //   seasons: {
  //     id: MediaId;
  //     name: string;
  //     poster_path: string | null;
  //     overview: string | null;
  //     air_date: string | null;
  //   }[];
  //   genres: string[];
  origin_country: string[];
  type: "tv" | "movie";
  source: "qq" | "iqiyi" | "mgtv" | "youku";
};

export type TVProfile = {
  id: MediaId;
  name: string;
  overview: string | null;
  seasons: {
    id: string;
    name: string;
    poster_path: string | null;
    season_number: number;
  }[];
  number_of_seasons: number;
};

export type SeasonProfile = {
  id: MediaId;
  /** 名称 */
  name: string;
  /** 简介 */
  overview: string | null;
  /** 海报 */
  poster_path: string | null;
  /** 第几季 */
  season_number: number;
  /** 剧集列表 */
  episodes: {
    id: string;
    /** 名称 */
    name: string;
    /** 简介 */
    overview: string;
    /** 时长 */
    duration: number;
    /** 第几集 */
    episode_number: number;
  }[];
  /** 总集数 */
  number_of_episode: number;
  /** 发布日期 */
  air_date: string;
  /** 类型/标签 */
  genres: string[];
  /** 发布地 */
  origin_country: string[];
  /** 演职人员 */
  persons: {
    name: string;
  }[];
};
