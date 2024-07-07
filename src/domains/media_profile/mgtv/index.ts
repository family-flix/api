/**
 * @file 芒果TV
 */
import { Result } from "@/domains/result/index";

import {
  fetch_episode_profile,
  fetch_season_profile,
  fetch_tv_profile_in_mgtv,
  fetch_movie_profile,
  search_media_in_mgtv,
  search_movie_in_tmdb,
} from "./services";

export class MGTVClient {
  options: {
    token?: string;
  };
  constructor(
    props: Partial<{
      token: string;
    }>
  ) {
    const { token } = props;
    this.options = {
      token,
    };
  }
  async search(keyword: string) {
    return search_media_in_mgtv(keyword, {});
  }
  /** 根据关键字搜索电视剧 */
  async search_tv(keyword: string, extra: Partial<{ page: number; language: "zh-CN" | "en-US" }> = {}) {
    const { token } = this.options;
    const { page } = extra;
    return search_media_in_mgtv(keyword, {
      page,
    });
  }
  /** 获取电视剧详情 */
  async fetch_tv_profile(id: number | string) {
    const { token } = this.options;
    const result = await fetch_tv_profile_in_mgtv(id, {
      api_key: token,
    });
    return result;
  }
  /** 获取季详情 */
  async fetch_season_profile(body: { tv_id: number; season_number: string | number }) {
    const { tv_id, season_number } = body;
    const { token } = this.options;
    const r = await fetch_season_profile(
      {
        tv_id,
        season_number: Number(season_number),
      },
      {
        api_key: token,
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
  /** 获取剧集详情 */
  async fetch_episode_profile(body: {
    tv_id: string | number;
    season_number: string | number;
    episode_number: string | number;
  }) {
    const { token } = this.options;
    const { tv_id, season_number, episode_number } = body;
    const result = await fetch_episode_profile(
      {
        tv_id,
        season_number,
        episode_number,
      },
      {
        api_key: token,
      }
    );
    return result;
  }
  /** 根据关键字搜索电影 */
  async search_movie(keyword: string, extra: Partial<{ page: number; language: "zh-CN" | "en-US" }> = {}) {
    const { token } = this.options;
    const { page } = extra;
    return search_movie_in_tmdb(keyword, {
      page,
      api_key: token,
    });
  }
  /** 获取电视剧详情 */
  async fetch_movie_profile(id: number | string) {
    const { token } = this.options;
    const result = await fetch_movie_profile(Number(id), {
      api_key: token,
    });
    return result;
  }
}
