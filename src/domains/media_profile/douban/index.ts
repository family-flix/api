/**
 * @file 豆瓣
 */
import axios from "axios";
import dayjs from "dayjs";
import uniq from "lodash/uniq";

import { Result, resultify, UnpackedResult } from "@/domains/result/index";
import { Unpacked } from "@/types/index";
import { DOUBAN_GENRE_TEXT_TO_VALUE, MediaTypes } from "@/constants/index";
import { num_to_chinese } from "@/utils/index";

import { RequestCommonPart } from "./services";
import { decrypt, DoubanSearchItem } from "./decrypt";
import { parse_profile_page_html, split_name_and_original_name } from "./utils";

export class DoubanClient {
  options: {
    token?: string;
  };
  debug = false;
  constructor(options: Partial<{ debug?: boolean; token: string }>) {
    const { debug, token } = options;
    this.options = {
      token,
    };
    if (debug !== undefined) {
      this.debug = debug;
    }
  }
  async search(keyword: string) {
    const text = keyword;
    // console.log("[SERVICE]media_profile/douban/index - search", text);
    const resp = await axios.get<string>(`https://search.douban.com/movie/subject_search?search_text=${text}`);
    const html = resp.data;
    if (this.debug) {
      console.log(html);
    }
    const rr = (() => {
      const re1 = /__DATA__ {0,1}= {0,1}"([^"]{1,})"/;
      const result1 = html.match(re1);
      if (result1) {
        const content = result1[1];
        const { items } = decrypt(content);
        return Result.Ok(items);
      }
      const re2 = /__DATA__ {0,1}= {0,1}(\{[^;]{1,});/;
      const result2 = html.match(re2);
      if (result2) {
        const content = result2[1];
        const { items } = JSON.parse(content) as { items: DoubanSearchItem[] };
        return Result.Ok(items);
      }
      return Result.Err("没有 __DATA__");
    })();
    if (rr.error) {
      return Result.Err(rr.error.message);
    }
    const items = rr.data;
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
          .replace(/&#x200e;/g, "")
          .replace(/ {2,}/g, " ");
        const air_date = name.match(/\(([0-9]{4})\)/);
        if (air_date) {
          name = name.replace(air_date[0], "").trim();
        }
        if (this.debug) {
          console.log("name", name);
        }
        const { name: n, origin_name } = split_name_and_original_name(name, { debug: this.debug });
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
    media: { type: MediaTypes; name: string; original_name: string | null; order: number; air_date: string | null },
    list: UnpackedResult<Unpacked<ReturnType<typeof this.search>>>["list"]
  ) {
    if (this.debug) {
      console.log("match exact media");
      console.log(media);
    }
    const { type, name, original_name, order, air_date } = media;
    if (list.length === 0) {
      return Result.Err("没有列表数据");
    }
    if (this.debug) {
      console.log(list);
    }
    const matched = (() => {
      const names_processed = [name, name.replace("：", "·")];
      if (type === MediaTypes.Movie) {
        const maybe_chinese_names = names_processed;
        const maybe_original_names = [original_name];
        const maybe_names = uniq([
          ...maybe_chinese_names,
          ...maybe_original_names,
          ...maybe_chinese_names.flatMap((item1) => maybe_original_names.map((item2) => [item1, item2].join(" "))),
        ]);
        for (let i = 0; i < maybe_names.length; i += 1) {
          const maybe_name = maybe_names[i];
          const matched = list.find((media) => {
            return maybe_name === media.name;
          });
          if (this.debug) {
            console.log(`${i + 1}、`, maybe_name, matched);
          }
          if (matched) {
            if (air_date) {
              if (String(dayjs(air_date).year()) === String(dayjs(matched.air_date).year())) {
                return matched;
              }
              return null;
            }
            return matched;
          }
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
        for (let i = 0; i < maybe_names.length; i += 1) {
          const maybe_name = maybe_names[i];
          const matched = list.find((media) => {
            return maybe_name === media.name;
          });
          if (this.debug) {
            console.log(`${i + 1}、`, maybe_name, matched);
          }
          if (matched) {
            if (air_date) {
              if (String(dayjs(air_date).year()) === String(dayjs(matched.air_date).year())) {
                return matched;
              }
            }
            if (this.debug) {
              console.log(`${i + 1}、`, maybe_name, "匹配了名称但不匹配发布时间");
            }
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
  async fetch_media_profile(id: number | string, query: RequestCommonPart = {}) {
    // return fetch_media_profile(Number(id), {});
    if (id === undefined) {
      return Result.Err("请传入电视剧 id");
    }
    const endpoint = `https://movie.douban.com/subject/${id}/`;
    const {} = query;
    const resp = await axios.get<string>(endpoint, {});
    const html = resp.data;
    const r = parse_profile_page_html(html);
    if (r.error) {
      return r;
    }
    return Result.Ok({
      id,
      ...r.data,
    });
  }
  async fetch_media_rank(values: { type: "tv" | "movie" }) {
    const endpoint = "https://movie.douban.com/j/search_subjects";
    const params = {
      type: values.type,
      tag: "热门",
      page_limit: "50",
      page_start: "0",
    };
    const resp = await axios.get(endpoint, {
      params,
    });
    const data: {
      subjects: {
        /** 集数描述 */
        episodes_info: string;
        /** 评分 */
        rate: string;
        cover_x: number;
        /** 影视剧名称 */
        title: string;
        /** 详情地址 */
        url: string;
        /** 是否可播放 */
        playable: boolean;
        /** 封面地址 */
        cover: string;
        /** 豆瓣ID */
        id: string;
        cover_y: number;
        /** 是否新上映 */
        is_new: boolean;
      }[];
    } = resp.data;
    return Result.Ok({
      list: data.subjects.map((record, index) => {
        const { title, episodes_info, rate, id } = record;
        return {
          name: title,
          order: index + 1,
          rate: rate ? Number(rate) : null,
          extra_text: episodes_info || null,
          douban_id: id,
        };
      }),
    });
  }
}
