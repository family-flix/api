/**
 * @file 腾讯视频
 */

import axios from "axios";

import { Result, resultify, UnpackedResult } from "@/domains/result/index";
import { Unpacked } from "@/types";
import { MediaId, SearchedTVItem, SeasonProfile, TVProfile } from "../types";
import { MEDIA_COUNTRY_MAP, MEDIA_SOURCE_MAP, MEDIA_TYPE_MAP } from "@/constants";

export type Language = "zh-CN" | "en-US";
export type RequestCommonPart = {
  api_key?: string;
};

const client = axios.create({
  timeout: 6000,
});
type RequestClient = {
  get: <T>(url: string, query?: Record<string, string | number | undefined>) => Promise<Result<T>>;
  post: <T>(url: string, body: Record<string, unknown>) => Promise<Result<T>>;
};
const request: RequestClient = {
  get: async <T extends null>(endpoint: string, query?: Record<string, string | number | undefined>) => {
    try {
      const url = endpoint;
      const resp = await client.get(url, {
        params: query,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.43(0x18002b2c) NetType/WIFI Language/zh_CN",
          // 获取季详情反而不能加
          Referer: "https://m.v.qq.com/",
        },
      });
      return Result.Ok<T>(resp.data);
    } catch (err) {
      const error = err as Error;
      return Result.Err(error.message);
    }
  },
  post: async <T>(endpoint: string, body?: Record<string, unknown>) => {
    try {
      const resp = await client.post(endpoint, body, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.43(0x18002b2c) NetType/WIFI Language/zh_CN",
          Referer: "https://m.v.qq.com/",
        },
      });
      return Result.Ok<T>(resp.data);
    } catch (err) {
      const error = err as Error;
      return Result.Err(error.message);
    }
  },
};

/**
 * 根据关键字搜索电视剧
 * @param keyword
 */
export async function search_media_in_qq(keyword: string, options: RequestCommonPart & { page?: number } = {}) {
  const endpoint = "https://pbaccess.video.qq.com/trpc.videosearch.mobile_search.HttpMobileRecall/MbSearchHttp";
  const body = {
    version: "",
    clientType: 1,
    filterValue: "firstTabid=150",
    uuid: "9E7C14F7-167B-4F3B-A91E-F607CAC48DE9",
    retry: 0,
    query: keyword,
    pagenum: 0,
    pagesize: 20,
    queryFrom: 4,
    sceneId: 21,
    searchDatakey: "",
    isneedQc: true,
    preQid: "XWGTmIWICDodZWq1UJCk1SISj8KjtV4UMAivnNt21Wr6bf4RJB_hwQ",
    adClientInfo: "",
    extraInfo: {
      isNewMarkLabel: "",
    },
    platform: "23",
  };
  const result = await request.post<{
    data: {
      errcode: number;
      errmsg: string;
      normalList: {
        itemList: {
          doc: {
            id: string;
            md: string;
            dataType: number;
          };
          videoInfo: {
            year: number;
            title: string;
            area: string;
            typeName: string;
            imgUrl: string;
            playSites: {
              uiType: number;
              showName: string;
              enName: string;
              totalEpisode: number;
            }[];
          };
        }[];
      };
    };
  }>(endpoint, body);
  const { error, data } = result;
  if (error) {
    return Result.Err(error.message);
  }
  if (data.data.errcode !== 0) {
    return Result.Err(data.data.errmsg);
  }
  const medias = data.data.normalList.itemList;
  const list: SearchedTVItem[] = [];
  for (let i = 0; i < medias.length; i += 1) {
    (() => {
      const {
        videoInfo: { title, year, imgUrl, area, typeName, playSites },
        doc: { id },
      } = medias[i];
      const payload = {
        id,
        name: title.replace(/<\/{0,1}em>/g, ""),
        original_name: null,
        overview: null,
        poster_path: imgUrl,
        backdrop_path: null,
        first_air_date: String(year),
        origin_country: [area].map((a) => MEDIA_COUNTRY_MAP[a]).filter(Boolean),
        type: playSites[0].uiType === 3 ? "movie" : "tv",
        source: MEDIA_SOURCE_MAP[playSites[0].enName],
      } as SearchedTVItem;
      list.push(payload);
    })();
  }
  return Result.Ok({
    list,
  });
}

/**
 * 根据关键字搜索电影
 * @param keyword
 */
export async function search_movie_in_qq(keyword: string, options: RequestCommonPart & { page?: number }) {
  const endpoint = `/search/movie`;
  const { page, api_key } = options;
  const query = {
    api_key,
    query: keyword,
    page,
    include_adult: "false",
  };
  const result = await request.get<{
    page: number;
    total_pages: number;
    total_results: number;
    results: {
      adult: boolean;
      backdrop_path: string;
      genre_ids: number[];
      id: number;
      original_language: string;
      original_title: string;
      overview: string;
      popularity: number;
      poster_path: string;
      release_date: string;
      title: string;
      video: boolean;
      vote_average: number;
      vote_count: number;
    }[];
  }>(endpoint, query);
  const { error, data } = result;
  if (error) {
    return Result.Err(error.message);
  }
  const resp = {
    page: data.page,
    total: data.total_results,
    list: data.results.map((result) => {
      const { title, original_title, backdrop_path, poster_path, release_date } = result;
      return {
        ...result,
        name: title,
        original_name: original_title,
        air_date: release_date,
        first_air_date: release_date,
        backdrop_path,
        poster_path,
      };
    }),
  };
  return Result.Ok(resp);
}

/**
 * 获取电视剧详情
 */
export async function fetch_tv_profile_in_qq(id: string | number, options: RequestCommonPart) {
  if (id === undefined) {
    return Result.Err("请传入电视剧 id");
  }
  const endpoint = String(id).startsWith("http") ? String(id) : `https://v.qq.com/x/cover/${id}.html`;
  const r = await request.get<string>(endpoint, {});
  if (r.error) {
    return Result.Err(r.error);
  }
  const data = r.data;
  const json_r = /window.__PINIA__ {0,1}= {0,1}([^<]{1,})</;
  const json: {
    page: {};
    global: {
      currentVid: string;
      currentCid: string;
      listKey: null;
      coverInfo: {
        data_flag: number;
        cover_id: string;
        second_title: string;
        type_name: string;
        album_classification_id: null;
        play_page_style_control_id: null;
        category_map: [number, string, number, string, number, string];
        guests: string[];
        ip_online_status_id: string[];
        pay_status: number;
        downright: string[];
        pay_for_knowledge_id: null;
        publish_date: string;
        episode_all: string;
        playright: string[];
        comment_show_type: number;
        description: string;
        copyright_id: number;
        type: number;
        cover_checkup_grade: number;
        copyright_negotiation_id: null;
        title: string;
        current_topic: null;
        interaction_type_id: null;
        area_name: string;
        pay_for_knowledge_name: null;
        column_id: number;
        new_pic_hz: string;
        dokiid_ip: string;
        cartoon_age: null;
        data_checkup_grade: number;
        holly_online_time: string;
        tag: null;
        hollywood_online: string;
        video_ids: string[];
        keyword: null;
        positive_trailer: number;
        alias: string[];
        movie_comment_set: number;
        big_horizontal_pic_url: null;
        leading_actor: string[];
      };
      videoInfo: {
        interactive_content_id: null;
        tail_time: number;
        state: number;
        type: number;
        c_title_output: string;
        pioneer_tag: string;
        title: string;
        pic160x90: string;
        desc: null;
        danmu: number;
        type_name: string;
        vid: string;
        danmu_status: number;
        play_page_style_control_id: null;
        duration: string;
        category_map: [number, string, number, string, number, string];
        topic_id_list: null;
        head_time: number;
        cover_list: string[];
        playright: string[];
        c_covers: string;
        positive_trailer: number;
      };
      relatedCoverInfo: null;
      videoInfo1006: {
        video_status: number;
        video_uploadTime: number;
        release_time: string;
        video_duration: number;
        video_type: number;
      };
      columnInfo: {
        description: string;
        title: string;
        column_id: string;
        hide_flag: number;
      };
      playInfoFetched: boolean;
      shouldFixUrl: boolean;
      pageStyle: string;
      videoTypePrecheck: number;
      pageType: number;
      pageTypeFetched: boolean;
      hasTopic: boolean;
      isNewInteract: boolean;
      isNewInteractFetched: boolean;
    };
    episodeMain: {
      epTabs: {
        isSelected: boolean;
        text: string;
        pageContext: string;
      }[];
      epTabsSettled: boolean;
      currentEpTabIndex: number;
      defaultEpTabIndex: number;
      firstPreloaded: boolean;
      refreshed: boolean;
      refreshedCalled: boolean;
      fetched: boolean;
      title: string;
      hasNextPage: boolean;
      listType: number;
      listData: {
        list: {
          cid: string;
          index: number;
          pic: string;
          picVertial: string;
          title: string;
          vid: string;
          duration: number;
          playTitle: string;
          fullTitle: string;
          publishDate: string;
          itemType: string;
          listKey: string;
          page: number;
          dtParams: {
            tab_id: string;
            tab_idx: number;
            mod_id: string;
            mod_idx: number;
            mod_title: string;
          };
          refreshPage: string;
          isNoStoreWatchHistory: boolean;
          videoSubtitle: string;
        }[][];
        tabs: unknown[];
        tabIndex: number;
        style: number;
        tabSettled: boolean;
        subTitle: string;
      }[];
      listMeta: unknown[];
    };
    epTabs: {
      isSelected: boolean;
      text: string;
      pageContext: string;
    }[];
    epTabsSettled: boolean;
    currentEpTabIndex: number;
    defaultEpTabIndex: number;
    firstPreloaded: boolean;
    refreshed: boolean;
    refreshedCalled: boolean;
    fetched: boolean;
    title: string;
    hasNextPage: boolean;
    listType: number;
    listData: {
      list: {
        cid: string;
        index: number;
        pic: string;
        picVertial: string;
        title: string;
        vid: string;
        duration: number;
        playTitle: string;
        fullTitle: string;
        publishDate: string;
        itemType: string;
        listKey: string;
        page: number;
        dtParams: {
          tab_id: string;
          tab_idx: number;
          mod_id: string;
          mod_idx: number;
          mod_title: string;
        };
        refreshPage: string;
        isNoStoreWatchHistory: boolean;
        videoSubtitle: string;
      }[][];
      tabs: unknown[];
      tabIndex: number;
      style: number;
      tabSettled: boolean;
      subTitle: string;
    }[];
    listMeta: unknown[];
  } | null = (() => {
    try {
      const j = data.match(json_r);
      if (!j) {
        return null;
      }
      const d = new Function(`return ${j[1]};`)();
      return d;
    } catch (err) {
      return null;
    }
  })();
  if (json === null) {
    return Result.Err("解析失败1");
  }
  const { global, episodeMain } = json;
  return Result.Ok({
    id,
    name: global.coverInfo.title,
    overview: global.coverInfo.description,
    poster_path: null,
    backdrop_path: null,
    seasons: episodeMain.epTabs.map((tab, i) => {
      const { text, pageContext } = tab;
      return {
        id: pageContext,
        name: text,
        poster_path: null,
        season_number: i + 1,
      };
    }),
    number_of_seasons: episodeMain.epTabs.length,
  } as TVProfile);
}

/**
 * 获取电视剧某一季详情
 * @link https://developers.themoviedb.org/3/tv/get-tv-details
 * @param number 第几季
 */
export async function fetch_season_profile_in_qq(
  body: {
    season_number: MediaId;
  },
  options: RequestCommonPart
) {
  const { season_number } = body;
  if (season_number === undefined) {
    return Result.Err("请传入季信息");
  }
  const id = season_number;
  const endpoint = String(id).startsWith("http") ? String(id) : `https://v.qq.com/x/cover/${id}.html`;
  console.log(endpoint);
  const r = await request.get<string>(endpoint, {});
  if (r.error) {
    return Result.Err(r.error);
  }
  const data = r.data;
  const json_r = /window.__PINIA__ {0,1}= {0,1}([^<]{1,})</;
  const json: {
    page: {};
    global: {
      currentVid: string;
      currentCid: string;
      listKey: null;
      coverInfo: {
        data_flag: number;
        cover_id: string;
        second_title: string;
        type_name: string;
        album_classification_id: null;
        play_page_style_control_id: null;
        category_map: [number, string, number, string, number, string];
        guests: string[];
        ip_online_status_id: string[];
        pay_status: number;
        downright: string[];
        pay_for_knowledge_id: null;
        publish_date: string;
        episode_all: string;
        playright: string[];
        comment_show_type: number;
        description: string;
        copyright_id: number;
        type: number;
        cover_checkup_grade: number;
        copyright_negotiation_id: null;
        title: string;
        current_topic: null;
        interaction_type_id: null;
        area_name: string;
        pay_for_knowledge_name: null;
        column_id: number;
        new_pic_hz: string;
        dokiid_ip: string;
        cartoon_age: null;
        data_checkup_grade: number;
        holly_online_time: string;
        tag: null;
        hollywood_online: string;
        video_ids: string[];
        keyword: null;
        positive_trailer: number;
        alias: string[];
        movie_comment_set: number;
        big_horizontal_pic_url: null;
        leading_actor: string[];
      };
      relatedCoverInfo: null;
      videoInfo1006: {
        video_status: number;
        video_uploadTime: number;
        release_time: string;
        video_duration: number;
        video_type: number;
      };
      columnInfo: {
        description: string;
        title: string;
        column_id: string;
        hide_flag: number;
      };
    };
    episodeMain: {
      epTabs: {
        isSelected: boolean;
        text: string;
        pageContext: string;
      }[];
      epTabsSettled: boolean;
      currentEpTabIndex: number;
      defaultEpTabIndex: number;
      firstPreloaded: boolean;
      refreshed: boolean;
      refreshedCalled: boolean;
      fetched: boolean;
      title: string;
      hasNextPage: boolean;
      listType: number;
      listData: {
        list: {
          cid: string;
          index: number;
          pic: string;
          picVertial: string;
          title: string;
          vid: string;
          duration: number;
          playTitle: string;
          fullTitle: string;
          publishDate: string;
          itemType: string;
          listKey: string;
          page: number;
          dtParams: {
            tab_id: string;
            tab_idx: number;
            mod_id: string;
            mod_idx: number;
            mod_title: string;
          };
          refreshPage: string;
          isNoStoreWatchHistory: boolean;
          videoSubtitle: string;
        }[][];
        tabs: unknown[];
        tabIndex: number;
        style: number;
        tabSettled: boolean;
        subTitle: string;
      }[];
      listMeta: unknown[];
    };
    epTabs: {
      isSelected: boolean;
      text: string;
      pageContext: string;
    }[];
    title: string;
    hasNextPage: boolean;
    listType: number;
    listData: {
      list: {
        cid: string;
        index: number;
        pic: string;
        picVertial: string;
        title: string;
        vid: string;
        duration: number;
        playTitle: string;
        fullTitle: string;
        publishDate: string;
        itemType: string;
        listKey: string;
        page: number;
        dtParams: {
          tab_id: string;
          tab_idx: number;
          mod_id: string;
          mod_idx: number;
          mod_title: string;
        };
        refreshPage: string;
        isNoStoreWatchHistory: boolean;
        videoSubtitle: string;
      }[][];
      tabs: unknown[];
      tabIndex: number;
      style: number;
      tabSettled: boolean;
      subTitle: string;
    }[];
    listMeta: unknown[];
  } | null = (() => {
    try {
      const j = data.match(json_r);
      if (!j) {
        return null;
      }
      const d = new Function(`return ${j[1]};`)();
      return d;
    } catch (err) {
      return null;
    }
  })();
  if (json === null) {
    return Result.Err("解析失败1");
  }
  const { global, episodeMain } = json;
  const { coverInfo } = global;
  return Result.Ok({
    id: coverInfo.cover_id,
    name: coverInfo.title,
    overview: coverInfo.description,
    poster_path: null,
    backdrop_path: null,
    air_date: coverInfo.publish_date,
    season_number: 0,
    genres: [coverInfo.type_name],
    origin_country: [coverInfo.area_name].map((a) => MEDIA_COUNTRY_MAP[a]),
    number_of_episode: Number(coverInfo.episode_all),
    episodes: episodeMain.listData[0]
      ? episodeMain.listData[0].list[0].map((episode) => {
          const { vid, title, publishDate, duration, index, pic } = episode;
          return {
            id: vid,
            name: title,
            overview: "",
            thumbnail: pic,
            air_date: publishDate,
            episode_number: index,
            duration,
          };
        })
      : [],
    persons: [],
  } as SeasonProfile);
}

/**
 * 获取指定季下所有剧集
 */
export async function fetch_episodes_of_season_in_qq(body: { tv_id: string | number; season_number: number }) {
  const endpoint = "https://v5m.api.mgtv.com/remaster/vrs/getVideoListByPartId";
  const r = await request.get<string>(endpoint, {
    partId: "",
    pageNum: 1,
    pageSize: 1,
  });
  if (r.error) {
    return Result.Err(r.error);
  }
}

/**
 * 获取电视剧某一集详情
 * @param number 第几季
 */
export async function fetch_episode_profile(
  body: {
    tv_id: number | string;
    season_number: number | string | undefined;
    episode_number: number | string | undefined;
  },
  option: RequestCommonPart
) {
  const { tv_id, season_number, episode_number } = body;
  if (season_number === undefined) {
    return Result.Err("请传入季数");
  }
  if (episode_number === undefined) {
    return Result.Err("请传入集数");
  }
  const endpoint = `/tv/${tv_id}/season/${season_number}/episode/${episode_number}`;
  const { api_key } = option;
  const result = await request.get<{
    air_date: string;
    episode_number: number;
    name: string;
    overview: string;
    id: number;
    production_code: string;
    runtime: number;
    season_number: number;
    still_path: string;
    vote_average: number;
    vote_count: number;
  }>(endpoint, {
    api_key,
  });
  if (result.error) {
    // console.log("find episode in tmdb failed", result.error.message);
    if (result.error.message.includes("404")) {
      return Result.Ok(null);
    }
    return Result.Err(result.error);
  }
  const { id, name, overview, air_date, runtime, episode_number: e_n, season_number: s_n } = result.data;
  return Result.Ok({
    id,
    name,
    air_date,
    overview,
    season_number: s_n,
    episode_number: e_n,
    runtime,
  });
}

export type EpisodeProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_episode_profile>>>;

/**
 * 获取电视剧详情
 * @link https://developers.themoviedb.org/3/tv/get-tv-details
 * @param id 电视剧 tmdb id
 */
export async function fetch_movie_profile(id: number | undefined, query: RequestCommonPart) {
  if (id === undefined) {
    return Result.Err("请传入电影 id");
  }
  const endpoint = `/movie/${id}`;
  const { api_key } = query;
  const r = await request.get<{
    adult: boolean;
    backdrop_path: string;
    belongs_to_collection: {
      id: number;
      name: string;
      poster_path: string;
      backdrop_path: string;
    };
    budget: number;
    genres: {
      id: number;
      name: string;
    }[];
    homepage: string;
    id: number;
    imdb_id: string;
    original_language: string;
    original_title: string;
    overview: string;
    popularity: number;
    poster_path: string;
    production_companies: {
      id: number;
      logo_path: string;
      name: string;
      origin_country: string;
    }[];
    production_countries: {
      iso_3166_1: string;
      name: string;
    }[];
    release_date: string;
    revenue: number;
    runtime: number;
    spoken_languages: {
      english_name: string;
      iso_639_1: string;
      name: string;
    }[];
    status: string;
    tagline: string;
    title: string;
    video: boolean;
    vote_average: number;
    vote_count: number;
  }>(endpoint, {
    api_key,
  });
  if (r.error) {
    return Result.Err(r.error);
  }
  const {
    overview,
    tagline,
    status,
    title,
    original_title,
    vote_average,
    release_date,
    poster_path,
    backdrop_path,
    popularity,
    runtime,
  } = r.data;
  return Result.Ok({
    id,
    title,
    original_title,
    name: title,
    original_name: original_title,
    air_date: release_date,
    release_date,
    overview,
    tagline,
    status,
    vote_average,
    popularity,
    genres: r.data.genres,
    runtime,
    origin_country: r.data.production_countries.map((country) => {
      return country["iso_3166_1"];
    }),
    poster_path,
    backdrop_path,
  });
}
export type MovieProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_movie_profile>>>;
