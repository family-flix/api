/**
 * @file 影视剧详情搜索
 */
import { Result } from "@/domains/result/index";
import {
  fetch_episode_profile,
  fetch_season_profile,
  fetch_tv_profile,
  fetch_movie_profile,
  Language,
  fetch_persons_of_season,
  fetch_person_profile,
  fetch_persons_of_movie,
  search_season_in_master,
  search_movie_in_master,
} from "./services";

export class MediaProfileClient {
  options: {
    token: string;
    language: Language;
  };
  constructor(
    options: Partial<{
      /** tmdb api key */
      token: string;
      /** 语言 */
      language: Language;
    }>
  ) {
    const { token, language = "zh-CN" } = options;
    if (token === undefined) {
      throw new Error("请传入 TMDB_TOKEN");
    }
    this.options = {
      token,
      language,
    };
  }
  /** 根据关键字搜索电视剧 */
  async search_season(
    keyword: string,
    extra: Partial<{ year: string | null; season_text: string | null; page: number; language: "zh-CN" | "en-US" }> = {}
  ) {
    const { token } = this.options;
    const { season_text, year, page, language } = extra;
    const k = (() => {
      return [keyword, season_text, year ? `(${year})` : null].filter(Boolean).join(" ");
    })();
    return search_season_in_master(k, {
      page,
      api_key: token,
      language: language || this.options.language,
    });
  }
  /** 获取电视剧详情 */
  async fetch_tv_profile(id: number | string) {
    const { token, language } = this.options;
    const result = await fetch_tv_profile(Number(id), {
      api_key: token,
      language,
    });
    return result;
  }
  /** 获取季详情 */
  async fetch_season_profile(body: { tv_id: number; season_number: string | number }) {
    const { tv_id, season_number } = body;
    const { token, language } = this.options;
    const r = await fetch_season_profile(
      {
        tv_id,
        season_number: Number(season_number),
      },
      {
        api_key: token,
        language,
      }
    );
    if (r.error) {
      return Result.Err(r.error);
    }
    if (!r.data) {
      return Result.Err("没有匹配的结果");
    }
    return Result.Ok(r.data);
  }
  /** 获取季详情 */
  async fetch_partial_season_profile(body: { tv_id: number; season_number: string | number }) {
    const { tv_id, season_number } = body;
    const { token, language } = this.options;
    const r = await fetch_tv_profile(tv_id, {
      api_key: token,
      language,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    const { seasons } = r.data;
    const matched_season = seasons.find((s) => {
      return s.season_number === season_number;
    });
    if (!matched_season) {
      return Result.Err("没有匹配的结果");
    }
    return Result.Ok(matched_season);
  }
  /** 获取剧集详情 */
  async fetch_episode_profile(body: {
    tv_id: string | number;
    season_number: string | number;
    episode_number: string | number;
  }) {
    const { token, language } = this.options;
    const { tv_id, season_number, episode_number } = body;
    const result = await fetch_episode_profile(
      {
        tv_id,
        season_number,
        episode_number,
      },
      {
        api_key: token,
        language,
      }
    );
    return result;
  }
  /** 根据关键字搜索电影 */
  async search_movie(
    keyword: string,
    extra: Partial<{ year: null | string; page: number; language: "zh-CN" | "en-US" }> = {}
  ) {
    const { token } = this.options;
    const { year, page, language } = extra;
    const k = (() => {
      return [keyword, year ? `(${year})` : null].filter(Boolean).join(" ");
    })();
    return search_movie_in_master(k, {
      page,
      api_key: token,
      language: language || this.options.language,
    });
  }
  /** 获取电视剧详情 */
  async fetch_movie_profile(id: number | string) {
    const { token, language } = this.options;
    const result = await fetch_movie_profile(Number(id), {
      api_key: token,
      language,
    });
    return result;
  }
  /** 获取电视剧季参与的演员、导演等工作人员 */
  async fetch_persons_of_season(values: { tv_id: number | string; season_number: number }) {
    const { token, language } = this.options;
    const { tv_id, season_number } = values;
    const result = await fetch_persons_of_season(
      { tv_id, season_number },
      {
        api_key: token,
        language,
      }
    );
    return result;
  }
  /** 获取电影参与的演员、导演等工作人员 */
  async fetch_persons_of_movie(values: { movie_id: number | string }) {
    const { token, language } = this.options;
    const { movie_id } = values;
    const result = await fetch_persons_of_movie(
      { movie_id },
      {
        api_key: token,
        language,
      }
    );
    return result;
  }
  /** 获取工作人员详情 */
  async fetch_person_profile(values: { person_id: number | string }) {
    const { token, language } = this.options;
    const { person_id } = values;
    const result = await fetch_person_profile(
      { person_id },
      {
        api_key: token,
        language,
      }
    );
    return result;
  }
}
interface TMDBTVSeason {
  id: number;
  /** 名称 一般是「第 n 季」这样，或者「特别篇」、「番外篇」这样，没有特别的意义 */
  name: string;
  /** 海报 */
  poster_path: string;
  /** 简介 */
  overview: string;
  /** 总集数 */
  episode_count: number;
  /** 首播日期 */
  air_date: string;
  /** 属于第几季 */
  season_number: number;
}
interface TMDBTVEpisode {
  id: number;
  /** 名称 一般是「第 n 季」这样，或者「特别篇」、「番外篇」这样，没有特别的意义 */
  name: string;
  /** 简介 */
  overview?: string;
  /** 海报 */
  poster_path?: string;
  /** 第几集 */
  episode_number: number;
  /** 首播日期 */
  air_date?: string;
  /** 总集数 */
  episode_count?: number;
  /** 第几季 */
  season_number: number;
}
interface TMDBTVProfile {
  id: number;
  name: string;
  /** 概述 */
  overview: string;
  /** 原产地名称 */
  original_name: string;
  /** 原产地语义 */
  original_language: string;
  poster_path?: string;
  backdrop_path?: string;
  first_air_date: string;
  /** 总季数 */
  number_of_seasons: number;
  /** 总集数 */
  number_of_episodes: number;
  /** 下一集 */
  next_episode_to_air?: TMDBTVEpisode;
  /** 是否还在连载  */
  in_production: boolean;
  seasons: TMDBTVSeason[];
}