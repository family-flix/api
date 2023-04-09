import {
  fetchSeasonProfile,
  fetch_tv_profile_in_tmdb,
  Language,
  search_tv_in_tmdb,
} from "./services";

export class TMDBClient {
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
      throw new Error("Please pass TMDB_TOKEN");
    }
    this.options = {
      token,
      language,
    };
  }
  async search_tv(
    keyword: string,
    extra: Partial<{ language: "zh-CN" | "en-US" }> = {}
  ) {
    const { token, language } = this.options;
    return search_tv_in_tmdb(keyword, {
      api_key: token,
      language: extra.language || language,
    });
  }
  async fetch_tv_profile(id: string | number) {
    const { token, language } = this.options;
    const result = await fetch_tv_profile_in_tmdb(id, {
      api_key: token,
      language,
    });
    return result;
  }
  async fetch_season_profile(number: string | number, tv_id: string | number) {
    const { token, language } = this.options;
    const result = await fetchSeasonProfile(number, tv_id, {
      api_key: token,
      language,
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
