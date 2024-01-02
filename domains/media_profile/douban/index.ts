/**
 * @file 豆瓣
 */
import axios from "axios";
import cheerio from "cheerio";

import { Result } from "@/types";

import {
  fetch_episode_profile,
  fetch_season_profile,
  fetch_tv_profile,
  fetch_movie_profile,
  search_tv_in_douban,
  search_movie_in_tmdb,
} from "./services";

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
    const resp = await axios.get(`https://www.douban.com/search?q=${keyword}`);
    const html = resp.data;
    const $ = cheerio.load(html);
    const $list = $(".result-list>.result");
    const result = [];
    for (let i = 0; i < $list.length; i += 1) {
      (() => {
        const $node = $($list[i]);
        const html = $node.html();
        if (!html) {
          return;
        }
        const type_r = /<span>\[([^\]]{1,})\]<\/span>/;
        const type = (() => {
          const r = html.match(type_r)?.[1];
          if (!r) {
            return null;
          }
          const MAP: Record<string, string> = {
            电视剧: "season",
            电影: "movie",
          };
          return MAP[r] ?? null;
        })();
        if (!type) {
          return;
        }
        const name_r = /<a[^>]{1,}>([^<]{1,})</;
        const poster_r = /<img src="([^"]{1,})"/;
        const overview_r = /<p>([^<]{1,})</;
        const info_r = /<span class="subject-cast">([^<]{1,})<\/span>/;
        const info = (() => {
          const m = html.match(info_r);
          if (!m) {
            return null;
          }
          const r = m[1].split("/").map((t) => t.trim());
          return {
            air_date: r[r.length - 1],
          };
        })();
        const vote_average_r = /<span class="rating_nums">([^<]{1,})<\/span>/;
        const payload = {
          name: html.match(name_r)?.[1] ?? null,
          overview: html.match(overview_r)?.[1] ?? null,
          poster_path: html.match(poster_r)?.[1] ?? null,
          air_date: info?.air_date ?? null,
          vote_average: html.match(vote_average_r)?.[1],
          type,
        };
        result.push(payload);
      })();
    }
    return Result.Ok({
      list: result,
    });
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
    const result = await fetch_tv_profile(Number(id), {
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
  /** 获取季详情 */
  async fetch_partial_season_profile(body: { tv_id: number; season_number: string | number }) {
    const { tv_id, season_number } = body;
    const { token } = this.options;
    const r = await fetch_tv_profile(tv_id, {
      api_key: token,
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
    const result = await fetch_movie_profile(Number(id), {
      // api_key: token,
    });
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
// class TV {
//   constructor(partial: { id: number }) {}
//   async detail() {
//     const endpoint = "";
//     request.get();
//   }
// }

// /**
//  * ----------------------------------------------------------------
//  * SEARCH TV
//  * ----------------------------------------------------------------
//  */
// #[derive(Serialize, Deserialize, Debug)]
// pub struct TMDBResult {
//   id: i32,
//   name: Option<String>,
//   media_type: Option<String>,
//   backdrop_path: Option<String>,
//   poster_path: Option<String>,
//   first_air_date: Option<String>,
//   genre_ids: Option<Vec<i32>>,
//   origin_country: Option<Vec<String>>,
//   original_language: Option<String>,
//   original_name: Option<String>,
//   overview: Option<String>,
//   popularity: Option<f32>,
//   vote_average: Option<f32>,
//   vote_count: Option<i32>,
//   adult: Option<bool>,
// }
// impl TMDBResult {
//   pub fn modify(&mut self) {
//     match &self.backdrop_path {
//       None => {}
//       Some(original_path) => {
//         let img = format!(
//           "{}{}",
//           "https://www.themoviedb.org/t/p/w1920_and_h800_multi_faces",
//           original_path.as_str(),
//         );
//         self.backdrop_path = Some(img);
//       }
//     }
//     match &self.poster_path {
//       None => {}
//       Some(original_path) => {
//         let img = format!(
//           "{}{}",
//           "https://image.tmdb.org/t/p/w600_and_h900_bestv2",
//           original_path.as_str(),
//         );
//         self.poster_path = Some(img);
//       }
//     }
//   }
// }

// #[derive(Serialize, Deserialize, Debug)]
// pub struct TMDBSearchResponse {
//   page: i32,
//   total_pages: i32,
//   total_results: i32,
//   results: Vec<TMDBResult>,
// }
// pub async fn search_tv(keyword: &str) -> Result<TMDBSearchResponse, Box<dyn Error>> {
//   println!("[] search_tv {}", keyword);
//   let host = "https://api.themoviedb.org/3";
//   let url = format!("{}/{}/{}", host, "search", "tv");
//   let tmdb_api_key = "c2e5d34999e27f8e0ef18421aa5dec38";
//   let params = [
//     ("api_key", tmdb_api_key),
//     ("language", "zh-CN"),
//     ("query", keyword),
//     ("page", "1"),
//     ("include_adult", "false"),
//   ];
//   let client = reqwest::Client::builder().build().unwrap();
//   let resp = client.get(url).query(&params).send().await?;
//   let mut data = resp.json::<TMDBSearchResponse>().await?;

//   println!("[] search_tv success and result is {:?}", data);

//   for res in data.results.iter_mut() {
//     res.modify();
//   }

//   Ok(data)
// }

// const TMDB_TOKEN = process.env.TMDB_TOKEN;
// export const tmdb = new TMDB_Client({
//   token: TMDB_TOKEN,
// });
