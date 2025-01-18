/**
 * @file TMDB 搜索客户端
 */
import { RequestCore } from "@/domains/request/index";
import { SearchedMovieItem, SearchedTVItem } from "@/domains/media_profile/types";
import { Result } from "@/domains/result/index";
import { HttpClientCore } from "@/domains/http_client/index";
import { connect } from "@/domains/http_client/provider.axios";

import {
  Language,
  fetch_episode_profile,
  fetch_season_profile,
  fetch_tv_profile,
  fetch_movie_profile,
  search_tv,
  search_tv_process,
  search_movie,
  fetch_persons_of_season,
  fetch_persons_of_movie,
  fetch_person_profile,
  fetch_tv_profile_process,
  fetch_season_profile_process,
  search_movie_process,
  fetch_persons_of_movie_process,
  fetch_person_profile_process,
  fetch_persons_of_season_process,
  fetch_episode_profile_process,
  fetch_movie_profile_process,
  request,
} from "./services";

const DefaultProps = {
  // hostname: "https://api.themoviedb.org/3",
  hostname: "https://proxy.funzm.com/api/tmdb/3",
  language: "zh-CN" as Language,
  token: "c2e5d34999e27f8e0ef18421aa5dec38",
};

export class TMDBClient {
  static TOKEN = DefaultProps.token;
  static New(
    props: Partial<{
      /** tmdb 接口 token */
      token: string;
      /** tmdb 代理地址 */
      hostname: string;
      /** 语言 */
      language?: Language;
    }>
  ) {
    const { token, hostname, language } = props;
    return Result.Ok(
      new TMDBClient({
        token,
        hostname,
        language,
      })
    );
  }

  options: {
    token: string;
    language: Language;
  };
  client: HttpClientCore;

  constructor(props: {
    /** tmdb 接口 token */
    token?: string;
    /** tmdb 代理地址 */
    hostname?: string;
    /** 语言 */
    language?: Language;
  }) {
    const { hostname = DefaultProps.hostname, token = DefaultProps.token, language = DefaultProps.language } = props;
    request.setHostname(hostname);
    this.options = {
      token,
      language,
    };
    const client = new HttpClientCore();
    connect(client, { timeout: 10000 });
    this.client = client;
  }
  tv_cache: Record<
    string,
    Result<{
      list: SearchedTVItem[];
    }>
  > = {};
  /** 根据关键字搜索电视剧 */
  async search_tv(keyword: string, extra: Partial<{ page: number; language: "zh-CN" | "en-US" }> = {}) {
    const { token } = this.options;
    const { page, language } = extra;
    const unique_key = [keyword, page].filter(Boolean).join("/");
    if (this.tv_cache[unique_key]) {
      return this.tv_cache[unique_key] as Result<{ total: number; page: number; list: SearchedTVItem[] }>;
    }
    const r = await new RequestCore(search_tv, { process: search_tv_process, client: this.client }).run({
      keyword,
      page,
      api_key: token,
      language: language || this.options.language,
    });
    if (r.error) {
      return r;
    }
    this.tv_cache[unique_key] = r;
    return r;
  }
  /** 获取电视剧详情 */
  async fetch_tv_profile(id: number | string) {
    const { token, language } = this.options;
    const result = await new RequestCore(fetch_tv_profile, {
      process: fetch_tv_profile_process,
      client: this.client,
    }).run(Number(id), {
      api_key: token,
      language,
    });
    return result;
  }
  /** 获取季详情 */
  async fetch_season_profile(body: { tv_id: number; season_number: string | number }) {
    const { tv_id, season_number } = body;
    const { token, language } = this.options;
    const r = await new RequestCore(fetch_season_profile, {
      process: fetch_season_profile_process,
      client: this.client,
    }).run(
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
    const r = await new RequestCore(fetch_tv_profile, { process: fetch_tv_profile_process, client: this.client }).run(
      tv_id,
      {
        api_key: token,
        language,
      }
    );
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
    const result = await new RequestCore(fetch_episode_profile, {
      process: fetch_episode_profile_process,
      client: this.client,
    }).run(
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
  movie_cache: Record<
    string,
    Result<{
      list: SearchedMovieItem[];
    }>
  > = {};
  /** 根据关键字搜索电影 */
  async search_movie(keyword: string, extra: Partial<{ page: number; language: "zh-CN" | "en-US" }> = {}) {
    const { token } = this.options;
    const { page, language } = extra;
    const unique_key = [keyword, page].filter(Boolean).join("/");
    if (this.movie_cache[unique_key]) {
      return this.movie_cache[unique_key] as Result<{ total: number; page: number; list: SearchedMovieItem[] }>;
    }
    const r = await new RequestCore(search_movie, { process: search_movie_process, client: this.client }).run(keyword, {
      page,
      api_key: token,
      language: language || this.options.language,
    });
    this.movie_cache[unique_key] = r;
    return r;
  }
  /** 获取电视剧详情 */
  async fetch_movie_profile(id: number | string) {
    const { token, language } = this.options;
    const result = await new RequestCore(fetch_movie_profile, {
      process: fetch_movie_profile_process,
      client: this.client,
    }).run(Number(id), {
      api_key: token,
      language,
    });
    return result;
  }
  /** 获取电视剧季参与的演员、导演等工作人员 */
  async fetch_persons_of_season(values: { tv_id: number | string; season_number: number }) {
    const { token, language } = this.options;
    const { tv_id, season_number } = values;
    const result = await new RequestCore(fetch_persons_of_season, {
      process: fetch_persons_of_season_process,
      client: this.client,
    }).run(
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
    const result = await new RequestCore(fetch_persons_of_movie, {
      process: fetch_persons_of_movie_process,
      client: this.client,
    }).run(
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
    const result = await new RequestCore(fetch_person_profile, {
      process: fetch_person_profile_process,
      client: this.client,
    }).run(
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
