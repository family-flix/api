/**
 * @file 腾讯视频
 */
import {
  fetch_episode_profile,
  fetch_season_profile_in_qq,
  fetch_tv_profile_in_qq,
  fetch_movie_profile,
  search_media_in_qq,
  search_movie_in_qq,
} from "./services";

export class QQVideoClient {
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

  /** 根据关键字搜索电视剧 */
  async search(keyword: string) {
    return search_media_in_qq(keyword, {});
  }
  /** 获取电视剧详情 */
  async fetch_tv_profile(id: number | string) {
    const { token } = this.options;
    const result = await fetch_tv_profile_in_qq(id, {
      api_key: token,
    });
    return result;
  }
  /** 获取季详情 */
  async fetch_season_profile(body: { tv_id?: number; season_number: string | number }) {
    const { season_number } = body;
    return fetch_season_profile_in_qq(
      {
        season_number,
      },
      {}
    );
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
    return search_movie_in_qq(keyword, {
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
