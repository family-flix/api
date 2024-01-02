/**
 * @file 爱奇艺
 */
import dayjs from "dayjs";

import { Result, Unpacked } from "@/types";
import { MEDIA_COUNTRY_MAP, MEDIA_GENRES_MAP } from "@/constants";

import {
  fetch_episode_profile_in_iqiyi,
  fetch_tv_profile_in_iqiyi,
  fetch_movie_profile_in_iqiyi,
  search_media_in_iqiyi,
  search_movie_in_iqiyi,
  iqiyi_request,
  IQiyiProfilePageInfo,
  IQiyiProfileBaseInfo,
  IQiyiEpisodeResp,
} from "./services";
import { format_people, build_iqiyi_query, format_poster_path } from "./utils";

export class IQiyiClient {
  options: {
    token?: string;
  };
  constructor(props: Partial<{}> = {}) {
    this.options = {};
  }

  async fetch_profile_page(url: string) {
    const r = await iqiyi_request.get<string>(url);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const data = r.data;
    const json_r = /window.Q.PageInfo.playPageInfo {0,1}= {0,1}(.+?);/;
    const json: IQiyiProfilePageInfo | null = (() => {
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
    return Result.Ok(json);
  }
  async fetch_base_info(id: number | string) {
    const query = build_iqiyi_query({
      entity_id: id,
    });
    const season_res = await iqiyi_request.get<{
      data: IQiyiProfileBaseInfo;
    }>("https://mesh.if.iqiyi.com/tvg/pcw/base_info", query);
    if (season_res.error) {
      return Result.Err(season_res.error.message);
    }
    const season_data = season_res.data;
    if (season_data === null) {
      return Result.Err("获取季列表失败");
    }
    if (season_data.data === null) {
      return Result.Err("获取季列表失败2");
    }
    const season_sources = (() => {
      if (season_data.data.template.pure_data.source_selector_bk) {
        return season_data.data.template.pure_data.source_selector_bk.sort((a, b) => a.order - b.order);
      }
      if (season_data.data.template.pure_data.selector_bk) {
        return season_data.data.template.pure_data.selector_bk.sort((a, b) => a.order - b.order);
      }
      return [];
    })();
    const seasons = [];
    for (let i = 0; i < season_sources.length; i += 1) {
      const { tab_name, entity_id, videos } = season_sources[i];
      const is_cur_season = season_data.data.base_data._id === entity_id;
      const season = {
        id: entity_id,
        name: tab_name,
        air_date: "",
        episodes: (() => {
          if (typeof videos === "string") {
            return [];
          }
          if (Array.isArray(videos)) {
            const v = videos.reduce((a, b) => {
              return a.concat(b.data);
            }, [] as Unpacked<typeof videos>["data"]);
            return v.map((v, i) => {
              const { short_display_name, publish_date, title, image_url } = v;
              return {
                name: title,
                air_date: publish_date ?? null,
                episode_number: i + 1,
                thumbnail: image_url,
              };
            });
          }
          if (typeof videos === "object") {
            const arr = Object.values(videos["feature_paged"])
              .reduce((a1, b1) => a1.concat(b1), [])
              .filter((v) => {
                return [1, 28].includes(v.content_type);
              })
              .sort((a, b) => a.album_order - b.album_order);
            return arr.map((v, i) => {
              const { short_display_name, album_order, title, image_url } = v;
              return {
                name: short_display_name,
                air_date: null,
                episode_number: album_order,
                thumbnail: image_url,
              };
            });
          }
          return [];
        })(),
      };
      if (season.episodes[0] && season.episodes[0].air_date) {
        season.air_date = season.episodes[0].air_date;
      }
      seasons.push(season);
    }
    const { base_data, template } = season_data.data;
    return Result.Ok({
      ...base_data,
      template,
      seasons,
    });
  }

  /**
   * 获取详情 + 季列表
   */
  async fetch_profile_with_seasons(url: string) {
    const profile_r = await this.fetch_profile_page(url);
    if (profile_r.error) {
      return Result.Err(profile_r.error.message);
    }
    const profile = profile_r.data;
    const base_r = await this.fetch_base_info(profile.tvId);
    if (base_r.error) {
      return Result.Err(base_r.error.message);
    }
    const base = base_r.data;
    const TYPE_MAP: Record<number, string> = {
      1: "movie",
      2: "season",
    };
    return Result.Ok({
      platform: "iqiyi",
      type: TYPE_MAP[profile.channelId] || "season",
      id: base._id,
      name: base.title,
      overview: base.desc,
      poster_path: format_poster_path(base.image_url).s4,
      backdrop_path: null,
      original_name: null,
      seasons: (() => {
        if (base.seasons.length == 0 && profile.channelId === 1) {
          return [
            {
              id: base._id,
              name: base.title,
              overview: base.desc,
              poster_path: format_poster_path(base.image_url).s4,
              air_date: dayjs(base.publish_date).format("YYYY-MM-DD"),
              genres: profile.categories
                .filter((c) => c.subType === 2)
                .map((t) => MEDIA_GENRES_MAP[t.name])
                .filter(Boolean),
              origin_country: profile.categories
                .filter((c) => [1, 0].includes(c.subType))
                .map((t) => MEDIA_COUNTRY_MAP[t.name])
                .filter(Boolean),
              persons: format_people(profile.people),
            },
          ];
        }
        return base.seasons.map((season) => {
          if (season.id !== base._id) {
            return {
              ...season,
              genres: [],
              origin_country: [],
              persons: [],
            };
          }
          const latest_episode = season.episodes[season.episodes.length - 1];
          return {
            ...season,
            name: base.title,
            overview: base.desc,
            poster_path: format_poster_path(base.image_url).s4,
            genres: profile.categories
              .filter((c) => c.subType === 2)
              .map((t) => MEDIA_GENRES_MAP[t.name])
              .filter(Boolean),
            origin_country: profile.categories
              .filter((c) => c.subType === 1)
              .map((t) => MEDIA_COUNTRY_MAP[t.name])
              .filter(Boolean),
            persons: format_people(profile.people),
            air_date: latest_episode?.air_date
              ? latest_episode.air_date.replace(/([0-9]{4})([0-9]{2})([0-9]{2})/, "$1-$2-$3")
              : null,
          };
        });
      })(),
    });
  }

  /** 聚合搜索 */
  search(keyword: string) {
    return search_media_in_iqiyi(keyword, {});
  }
  /** 根据关键字搜索电视剧 */
  async search_tv(keyword: string, extra: Partial<{ page: number; language: "zh-CN" | "en-US" }> = {}) {
    const { page } = extra;
    return search_media_in_iqiyi(keyword, {
      page,
    });
  }
  /** 获取电视剧详情 */
  async fetch_tv_profile(id: number | string) {
    const result = await fetch_tv_profile_in_iqiyi(id, {});
    return result;
  }
  /** 获取季详情 */
  async fetch_season_profile(season_id: string | number) {
    const season_r = await this.fetch_base_info(season_id);
    if (season_r.error) {
      console.log("this.fetch_base_info failed", season_r.error.message);
      return Result.Err(season_r.error.message);
    }
    const season_data = season_r.data;
    const query = build_iqiyi_query({
      album_id: season_id,
    });
    const episodes_r = await iqiyi_request.get<IQiyiEpisodeResp>("https://mesh.if.iqiyi.com/tvg/v2/selector", query);
    if (episodes_r.error) {
      console.log("/tvg/v2/selector failed", episodes_r.error.message);
      return Result.Err(episodes_r.error.message);
    }
    const d = episodes_r.data.data;
    if (!d) {
      return Result.Err("获取剧集列表失败");
    }
    const videos = (() => {
      if (Array.isArray(d.videos)) {
        const v = d.videos.reduce((a, b) => {
          return a.concat(b.data);
        }, [] as Unpacked<typeof d.videos>["data"]);
        return v.map((v, i) => {
          const { page_url, short_display_name, publish_date, title, image_url } = v;
          return {
            id: page_url,
            name: title,
            air_date: publish_date ?? null,
            episode_number: i + 1,
            thumbnail: image_url,
          };
        });
      }
      if (typeof d.videos === "object") {
        const arr = Object.values(d.videos["feature_paged"])
          .reduce((a1, b1) => a1.concat(b1), [])
          .filter((v) => {
            // 1正片 3 预告 28花絮/番外/彩蛋等
            return [1, 28].includes(v.content_type);
          })
          .sort((a, b) => a.album_order - b.album_order);
        return arr.map((v, i) => {
          const { page_url, short_display_name, album_order, title, image_url } = v;
          return {
            id: page_url,
            name: short_display_name,
            air_date: null,
            episode_number: album_order,
            thumbnail: image_url,
          };
        });
      }
      return [];
    })();
    // console.log(season_data.data.base_data.title, "videos", videos.length);
    const episodes = videos;
    const latest_episode = episodes[0];
    if (!latest_episode) {
      return Result.Err("获取剧集列表失败2");
    }
    const r2 = await this.fetch_profile_page(latest_episode.id);
    if (r2.error) {
      console.log("this.fetch_profile_page failed");
      return Result.Err(r2.error);
    }
    const profile = r2.data;
    const season_payload = {
      id: season_data._id,
      name: season_data.title,
      overview: season_data.desc,
      poster_path: format_poster_path(season_data.image_url).s4,
      air_date: latest_episode.air_date,
      episode_count: season_data.total_episode,
      episodes,
      genres: profile.categories
        .filter((c) => c.subType === 2)
        .map((t) => MEDIA_GENRES_MAP[t.name])
        .filter(Boolean),
      origin_country: profile.categories
        .filter((c) => c.subType === 1)
        .map((t) => MEDIA_COUNTRY_MAP[t.name])
        .filter(Boolean),
      persons: format_people(profile.people),
    };
    return Result.Ok({
      id: season_payload.id,
      name: season_payload.name,
      original_name: null,
      overview: season_payload.overview,
      poster_path: season_payload.poster_path,
      backdrop_path: null,
      episodes: season_payload.episodes,
      // in_production: false,
      air_date: season_payload.air_date,
      genres: season_payload.genres,
      origin_country: season_payload.origin_country,
      persons: season_payload.persons,
    });
  }
  /** 获取剧集详情 */
  async fetch_episode_profile(body: {
    tv_id: string | number;
    season_number: string | number;
    episode_number: string | number;
  }) {
    const { token } = this.options;
    const { tv_id, season_number, episode_number } = body;
    const result = await fetch_episode_profile_in_iqiyi(
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
    return search_movie_in_iqiyi(keyword, {
      page,
      api_key: token,
    });
  }
  /** 获取电视剧详情 */
  async fetch_movie_profile(id: number | string) {
    const { token } = this.options;
    const result = await fetch_movie_profile_in_iqiyi(Number(id), {
      api_key: token,
    });
    return result;
  }
}
