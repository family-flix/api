/**
 * @file 豆瓣
 */
import axios from "axios";
import uniq from "lodash/uniq";

import { Result, Unpacked, UnpackedResult } from "@/types";
import { DOUBAN_GENRE_TEXT_TO_VALUE, MediaTypes } from "@/constants";
import { num_to_chinese } from "@/utils";

import {
  fetch_episode_profile,
  fetch_season_profile,
  fetch_media_profile,
  search_tv_in_douban,
  search_movie_in_tmdb,
} from "./services";
import { decrypt } from "./decrypt";
import { split_name_and_original_name } from "./utils";

export class DoubanClient {
  options: {
    token?: string;
  };
  constructor(
    options: Partial<{
      /** tmdb api key */
      token: string;
    }>
  ) {
    const { token } = options;
    this.options = {
      token,
    };
  }
  async search(keyword: string) {
    const text = keyword;
    console.log("[SERVICE]media_profile/douban/index - search", text);
    const resp = await axios.get<string>(`https://search.douban.com/movie/subject_search?search_text=${text}`);
    const html = resp.data;
    const r = /__DATA__ {0,1}= {0,1}"([^"]{1,})"/;
    const m = html.match(r);
    if (!m) {
      return Result.Err("没有 __DATA__");
    }
    const content = m[1];
    const { items } = decrypt(content);
    const result = [];
    for (let i = 0; i < items.length; i += 1) {
      (() => {
        const { id, title, cover_url, abstract, abstract_2, rating, labels } = items[i];
        if (!abstract) {
          return;
        }
        // const { count, value, star_count } = rating;
        const fields = abstract.split("/").map((t) => t.trim());
        const genres = fields
          .map((field) => {
            const v = DOUBAN_GENRE_TEXT_TO_VALUE[field];
            if (v) {
              return {
                value: v,
                label: field,
              };
            }
            return null;
          })
          .filter(Boolean) as {
          value: number;
          label: string;
        }[];
        const type = (() => {
          if (labels.length === 0) {
            return null;
          }
          const t = labels[0].text;
          if (t === "剧集") {
            return "tv";
          }
          return "movie";
        })();
        let name = title
          .replace(/\u200E/g, "")
          .replace(/&lrm;/g, "")
          .replace(/&#x200e;/g, "");
        const air_date = name.match(/\(([0-9]{4})\)/);
        if (air_date) {
          name = name.replace(air_date[0], "").trim();
        }
        const { name: n, origin_name } = split_name_and_original_name(name);
        const payload = {
          id,
          name: n.trim().replace(/ {2,}/g, " "),
          origin_name,
          overview: null,
          poster_path: cover_url,
          air_date: air_date ? air_date[1] : null,
          vote_average: rating?.value || null,
          type,
          genres,
        };
        result.push(payload);
      })();
    }
    return Result.Ok({
      list: result,
    });
  }
  /** 在搜索结果列表中，找到最匹配的结果 */
  match_exact_media(
    season: { type: MediaTypes; name: string; original_name: string | null; order: number; air_date: string | null },
    list: UnpackedResult<Unpacked<ReturnType<typeof this.search>>>["list"]
  ) {
    const { type, name, original_name, order, air_date } = season;
    if (list.length === 0) {
      return Result.Err("没有列表数据");
    }
    const matched = (() => {
      const names_processed = [name, name.replace("：", "·")];
      if (type === MediaTypes.Movie) {
        const matched = list.find((media) => {
          if (air_date) {
            return names_processed.includes(media.name) && air_date === media.air_date;
          }
          return names_processed.includes(media.name);
        });
        if (matched) {
          return matched;
        }
        return null;
      }
      if (type === MediaTypes.Season) {
        const maybe_season_num = [
          order === 1 ? "" : order,
          order,
          ` 第${order}季`,
          ` 第${num_to_chinese(order)}季`,
          ` Season ${order}`,
        ];
        const maybe_chinese_names = maybe_season_num
          .map((n) => {
            return names_processed.map((nn) => {
              return [nn, n].filter(Boolean).join("");
            });
          })
          .reduce((prev, name) => {
            return [...prev, ...name];
          }, [] as string[]);
        const maybe_original_names = original_name
          ? maybe_season_num.map((n) => {
              return [original_name, n].filter(Boolean).join("");
            })
          : [];
        const maybe_names = uniq([
          ...maybe_chinese_names,
          ...maybe_original_names,
          ...maybe_chinese_names.flatMap((item1) => maybe_original_names.map((item2) => [item1, item2].join(" "))),
        ]);
        console.log(maybe_names);
        for (let i = 0; i < maybe_names.length; i += 1) {
          const maybe_name = maybe_names[i];
          const matched = list.find((media) => {
            return maybe_name === media.name;
          });
          if (matched) {
            return matched;
          }
        }
        return null;
      }
      return null;
    })();
    if (!matched) {
      return Result.Err("没有完美匹配结果");
    }
    return Result.Ok(matched);
  }
  /** 根据关键字搜索电视剧 */
  async search_tv(keyword: string, extra: Partial<{ page: number; language: "zh-CN" | "en-US" }> = {}) {
    const { token } = this.options;
    const { page } = extra;
    return search_tv_in_douban(keyword, {
      page,
      // api_key: token,
    });
  }
  /** 获取电视剧详情 */
  async fetch_tv_profile(id: number | string) {
    const { token } = this.options;
    const result = await fetch_media_profile(Number(id), {
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
        // api_key: token,
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
        // api_key: token,
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
    const result = await fetch_media_profile(Number(id), {
      // api_key: token,
    });
    return result;
  }
  async fetch_media_profile(id: number | string) {
    return fetch_media_profile(Number(id), {});
  }
}
