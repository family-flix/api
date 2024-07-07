/**
 * @file 爱奇艺 客户端
 */
import axios from "axios";
// import dayjs from "dayjs";

import { Result, resultify, UnpackedResult } from "@/domains/result/index";
import { MEDIA_TYPE_MAP, MEDIA_COUNTRY_MAP } from "@/constants";
import { Unpacked } from "@/types";
import { query_stringify } from "@/utils";

import { SearchedTVItem } from "../types";

export type Language = "zh-CN" | "en-US";
export type RequestCommonPart = {
  /** tmdb api key */
  api_key?: string;
};

let cache: Record<string, any> = {};
function clear_cache() {
  cache = {};
}
const client = axios.create({
  timeout: 6000,
});
type RequestClient = {
  get: <T>(url: string, query?: Record<string, string | number | undefined>) => Promise<Result<T>>;
  post: <T>(url: string, body: Record<string, string | number | undefined>) => Promise<Result<T>>;
};
export const iqiyi_request: RequestClient = {
  get: async <T extends null>(endpoint: string, query?: Record<string, string | number | undefined>) => {
    const url = endpoint;
    // setTimeout(() => {
    //   clear_cache();
    // }, 2000);
    try {
      // if (cache[url]) {
      //   return Result.Ok<T>(cache[url]);
      // }
      const resp = await client.get(url, {
        params: query,
        headers: {
          authority: "www.iqiyi.com",
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
          "cache-control": "max-age=0",
          cookie:
            "QC005=4798183996645ebf3163434564f5252c; QC008=1694932585.1694932585.1694932585.1; QC006=cd9917dd6a613df76c79807d7413ecf6; __uuid=0fdf2eff-7672-e7c0-9e22-2c3b7f2f6379; QP0030=1; TQC030=1; QC191=; nu=0; QC173=0; T00404=b950203af0d3a4e1fa42f3576221019d; P00004=.1694932932.d6a7d0cfef; QP0034=%7B%22v%22%3A15%2C%22dp%22%3A1%2C%22dm%22%3A%7B%22wv%22%3A1%7D%2C%22m%22%3A%7B%22wm-vp9%22%3A1%2C%22wm-av1%22%3A1%2C%22m4-hevc%22%3A1%2C%22m4-dv%22%3A1%7D%2C%22hvc%22%3Atrue%7D; QCH001=1; H5_AB=8; QC197=all_ab_tags%2C472_A%2C6916_B%2C7495_B%2C1579_A%2C7522_A; QC175=%7B%22upd%22%3Atrue%2C%22ct%22%3A%22%22%7D; QC189=5257_B%2C6082_B%2C5335_B%2C5465_B%2C6843_B%2C6832_C%2C7074_C%2C5924_D%2C6151_C%2C5468_B%2C7024_C%2C5592_B%2C6031_B%2C6629_B%2C5670_B%2C7301_B%2C6050_B%2C6578_B%2C6312_B%2C6091_B%2C7090_B%2C6237_B%2C6249_C%2C6704_C%2C7431_C%2C6752_C%2C7332_B%2C7423_C%2C7581_B; agreementUpdate=V1; QC216=a11fa72d7b211e435887e4d0599233ca913a76cd9f25c93c79246d94f74d98048d; QC215=bf6dd69bfcb1d1927697f6ecbcefede5; QC217=89b4e783321a00aa78b1f458c8f247a2; QC142=p_02_01; QC187=true; QP0025=1; QP0035=2; QP0033=1; T00700=EgcI9L-tIRABEgcI58DtIRABEgcIq8HtIRABEgcIrcHtIRABEgcI8L-tIRABEgcI67-tIRABEgcIz7-tIRABEgcIkMDtIRABEgcIisHtIRADEgcIg8DtIRABEgcI0b-tIRABEgcI4b-tIRABEgcIhcDtIRABEgcIi8HtIRACEgcI87-tIRABEgcI7L-tIRABEgcImMDtIRABEgcI57-tIRAB; __dfp=a1b20edd755fec4e2eb47ccc9f080bb945fcefbd71b8e05bd01ee7ff4dce820e93@1701245960075@1699949961075; QP007=1680; QC007=DIRECT; QP0036=20231126%7C1750.719; QC021=%5B%7B%22key%22%3A%22%E5%AE%81%E5%AE%89%22%7D%2C%7B%22key%22%3A%22%E7%8E%8B%E7%89%8C%22%7D%2C%7B%22key%22%3A%22%E5%A5%94%E8%B7%91%E5%90%A7%22%7D%2C%7B%22key%22%3A%22%E5%B0%91%E5%B9%B4%22%7D%2C%7B%22key%22%3A%22%E7%8E%8B%E7%89%8C%E5%AF%B9%E7%8E%8B%E7%89%8C%22%7D%5D; __oaa_session_id__=22c96338c29e451ae9711e3a6bba5aa8; QC010=117926622; IMS=IggQEhj_1o2rBioqCiA3OGY4OWZhOTQwNjdiMWEzMjRhYzVjMDQ4MDNlODQ2YhAAIgAoUDAFMAAwADAAciQKIDc4Zjg5ZmE5NDA2N2IxYTMyNGFjNWMwNDgwM2U4NDZiEACCAQCKASQKIgogNzhmODlmYTk0MDY3YjFhMzI0YWM1YzA0ODAzZTg0NmI; QP0027=37; QP0037=180",
          referer: "https://so.iqiyi.com/",
          "sec-ch-ua": '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        },
      });
      // cache[url] = resp.data;
      return Result.Ok<T>(resp.data);
    } catch (err) {
      const error = err as Error;
      return Result.Err(error.message);
    }
  },
  post: async <T>(endpoint: string, body?: Record<string, unknown>) => {
    const url = endpoint;
    // setTimeout(() => {
    //   clear_cache();
    // }, 2000);
    try {
      // if (cache[url]) {
      //   return Result.Ok<T>(cache[url]);
      // }
      const resp = await client.post(url, body, {
        headers: {},
      });
      // cache[url] = resp.data;
      return Result.Ok<T>(resp.data);
    } catch (err) {
      const error = err as Error;
      return Result.Err(error.message);
    }
  },
};

/**
 * 详情页数据
 * 包含了当前剧集、季/电影信息
 */
export type IQiyiProfilePageInfo = {
  tvId: number;
  albumId: number;
  /**
   * 大类别
   * 1电影
   * 2电视剧
   */
  channelId: number;
  /** 简介 */
  description: string;
  subtitle: string;
  /**
   * 在原始图片链接后面可以拼接三种尺寸
   * https://pic5.iqiyipic.com/image/20231123/1f/da/v_174083380_m_601_m5.jpg
   * https://pic5.iqiyipic.com/image/20231123/1f/da/v_174083380_m_601_m5_260_360.jpg
   * https://pic5.iqiyipic.com/image/20231123/1f/da/v_174083380_m_601_m5_405_540.jpg
   * https://pic5.iqiyipic.com/image/20231123/1f/da/v_174083380_m_601_m5_579_772.jpg
   * 拼接另外两种，直接变成截图
   * https://pic5.iqiyipic.com/image/20231123/1f/da/v_174083380_m_601_m5_480_270.jpg
   * https://pic5.iqiyipic.com/image/20231123/1f/da/v_174083380_m_601_m5_592_333.jpg
   */
  imageUrl: string;
  albumImageUrl: string;
  /** 非综艺有这个 */
  videoCount: string;
  /**
   * 时长
   * 02:08:24 这种格式
   */
  duration: string;
  /** 时长，秒数 */
  durationSec: number;
  /**
   * 上映时间（院线电影才有这个？）
   */
  period: string;
  /**
   * 0配音语种
   * 2类型
   * 3标签
   */
  categories: {
    id: number;
    qipuId: number;
    name: string;
    /**
     * 2 类型
     */
    subType: number;
    lastUpdateTime: number;
    display: number;
    subName: string;
    parentId: number;
    childOrder: number;
    mainMelody: boolean;
    url: string;
  }[];
  albumName: string;
  /** 评分 */
  score: number;
  /** 演职员 */
  people: Record<
    string,
    {
      id: number;
      name: string;
      /** 角色名 */
      character: string[];
      image_url: string;
      paopao_summary: {
        circle_id: number;
        circle_id_type: string;
      };
    }[]
  >;
};

/**
 * 单纯的剧或电影信息
 */
export type IQiyiProfileBaseInfo = {
  base_data: {
    _id: number;
    share_url: string;
    album_source_type: string;
    qipu_id: number;
    title: string;
    current_video_title: string;
    current_video_content_type: number;
    current_video_is_lock: boolean;
    is_classic_hd: boolean;
    current_video_year: string;
    ab_test_tag: string;
    board_info: {
      board_txt: string;
      board_order: number;
      related_temp: string;
      board_type: string;
    };
    business_type: unknown[];
    channel_id: number;
    heat: number;
    desc: string;
    feature_id: number;
    /** 海报 */
    image_url: string;
    is_download_allowed: boolean;
    play_show_status: number;
    play_url: string;
    promote_vip_type: number;
    /** 上映时间 */
    publish_date: string;
    label: {
      txt: string;
      type: number;
      style: string;
    }[];
    update_info: {
      update_notification: string;
      update_status: string;
      extra_tip: string;
      album_finish: boolean;
    };
    update_time: string;
    score_info: {
      user_score: null;
      user_score_count: null;
      sns_score: string;
      sns_star_number_info: {
        star_total_number: number;
        one_star_number: number;
        two_star_number: number;
        three_star_number: number;
        four_star_number: number;
        five_star_number: number;
      };
    };
    album_calendar: {
      start_update_time: string;
    };
    can_give: boolean;
    is_ugc: boolean;
    feature_count: number;
    show_interact_btn: boolean;
    total_episode: number;
    ai: {
      people_rec: boolean;
      bgm_rec: boolean;
    };
    warm_up: boolean;
    cloud_cinema: boolean;
    new_play_list: boolean;
    old_lib: boolean;
    can_favor: boolean;
  };
  template: {
    template_id: string;
    version: string;
    pure_data: {
      /** 电视剧剧集 */
      selector_bk: {
        videos: {
          feature_paged: Record<
            string,
            {
              page_url: string;
              play_show_status: number;
              multi_episode_order: number;
              play_url: string;
              pay_mark_url: string;
              image_url: string;
              short_display_name: string;
              title: string;
              pay_mark: number;
              mark_type_show: number;
              qipu_id: number;
              last_update_time: string;
              scaled_img_size: string[];
              subtitle: string;
              content_type: number;
              album_order: number;
            }[]
          >;
          /** 可以理解成 tab，就是上面 Record 的 key */
          page_keys: string[];
        };
        language: string;
        tab_name: string;
        order: number;
        entity_id: number;
        video_list_type: string;
        is_group: boolean;
      }[];
      /** 综艺/真人秀剧集 */
      source_selector_bk: {
        videos:
          | string
          | {
              title: string;
              data: {
                page_url: string;
                play_show_status: number;
                multi_episode_order: number;
                play_url: string;
                pay_mark_url: string;
                image_url: string;
                short_display_name: string;
                title: string;
                pay_mark: number;
                mark_type_show: number;
                qipu_id: number;
                last_update_time: string;
                scaled_img_size: string[];
                content_type: number;
                subtitle: string;
                publish_date: string;
              }[];
            }[];
        language: string;
        tab_name: string;
        order: number;
        entity_id: number;
        video_list_type: string;
        is_group: boolean;
      }[];
    };
  };
};

/**
 * 获取剧集列表的响应
 */
export type IQiyiEpisodeResp = {
  data: {
    videos:
      | {
          feature_paged: Record<
            string,
            {
              page_url: string;
              play_show_status: number;
              multi_episode_order: number;
              play_url: string;
              pay_mark_url: string;
              image_url: string;
              short_display_name: string;
              title: string;
              pay_mark: number;
              mark_type_show: number;
              qipu_id: number;
              last_update_time: string;
              scaled_img_size: string[];
              /**
               * 1正片
               * 3预告
               * 28花絮/番外/彩蛋等
               */
              content_type: number;
              subtitle: string;
              album_order: number;
            }[]
          >;
          page_keys: string[];
        }
      | {
          title: string;
          data: {
            page_url: string;
            play_show_status: number;
            multi_episode_order: number;
            play_url: string;
            pay_mark_url: string;
            image_url: string;
            short_display_name: string;
            title: string;
            pay_mark: number;
            mark_type_show: number;
            qipu_id: number;
            last_update_time: string;
            scaled_img_size: string[];
            content_type: number;
            subtitle: string;
            publish_date: string;
          }[];
        }[];
    entity_id: number;
  };
};

/**
 * 根据关键字搜索电视剧
 * @param keyword
 */
export async function search_media_in_iqiyi(keyword: string, options: RequestCommonPart & { page?: number } = {}) {
  const endpoint = `https://so.iqiyi.com/so/q_${encodeURIComponent(keyword)}`;
  const query = {
    source: "input",
  };
  const result = await iqiyi_request.get<string>(endpoint, query);
  const { error, data } = result;
  if (error) {
    return Result.Err(error.message);
  }
  const r = data.match(/window.__NUXT__ {0,1}= {0,1}(.+?)<\/script>/);
  if (!r) {
    return Result.Err("window 上没有 __NUXT__ 字段");
  }
  const json_res: Result<{
    data: {
      cardData?: {
        list: {
          id: number;
          hasVip: boolean;
          cid: number;
          idx: number;
          videoDocType: number;
          /** 来源站id */
          siteId: string;
          /** 来源站 */
          siteName: string;
          /** 标签 */
          tag: string;
          /** 停播时间 */
          stopPlayTime: null;
          /** 名称 */
          g_title: string;
          /** 访问链接 */
          g_main_link: string;
          /** 描述 */
          desc: string;
          /** 封面 */
          g_img: string;
          /** 封面尺寸 */
          g_img_size: string;
          /** 发布年 */
          year: string;
          region: string;
          director: unknown[];
          /** 主持人 */
          host: string[];
          /** 嘉宾 */
          guest: string[];
          /** 发布时间 */
          releaseTime: string;
          /** 剧集列表 */
          videoinfos: {
            /** 发布时间 */
            date: string;
            /** 名称 */
            name: string;
            /** 访问链接 */
            url: string;
            /** 顺序 */
            order: number;
            /** 是否支付？ */
            isPay: boolean;
            /** 如果是第一个，就有该参数，值为 0 */
            STRATEGY_ORDER: number;
          }[];
          moreLink: string;
          isSource: boolean;
          /** 是否系列局 */
          isSeries: boolean;
          /** 是否直播 */
          isLive: boolean;
          isMoreList: boolean;
          doc_id: string;
        }[];
      };
    }[];
  }> = (() => {
    try {
      const d = new Function(`return ${r[1]};`)();
      return Result.Ok(d);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e.message);
    }
  })();
  if (json_res.error) {
    return Result.Err(json_res.error.message);
  }
  const json = json_res.data;
  const matched = json.data.find((j) => j.cardData);
  if (!matched) {
    return Result.Err("列表结构中没有 cardData 字段");
  }
  if (!matched.cardData) {
    return Result.Err("结构中没有 cardData 字段");
  }
  return Result.Ok({
    list: matched.cardData.list.map((card) => {
      const { g_title, siteId, desc, g_img, tag, g_main_link, releaseTime, region } = card;
      return {
        id: g_main_link,
        name: g_title,
        original_name: null,
        overview: desc,
        poster_path: g_img,
        backdrop_path: null,
        first_air_date: releaseTime,
        origin_country: [region].map((c) => MEDIA_COUNTRY_MAP[c]).filter(Boolean),
        type: MEDIA_TYPE_MAP[tag] ?? null,
        source: siteId,
      } as SearchedTVItem;
    }),
  });
}

/**
 * 根据关键字搜索电视剧
 * @param keyword
 */
export async function search_movie_in_iqiyi(keyword: string, options: RequestCommonPart & { page?: number }) {
  const endpoint = `/search/movie`;
  const { page, api_key } = options;
  const query = {
    api_key,
    query: keyword,
    page,
    include_adult: "false",
  };
  const result = await iqiyi_request.get<{
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
export type MovieProfileItemInTMDB = UnpackedResult<Unpacked<ReturnType<typeof search_movie_in_iqiyi>>>["list"][number];

/**
 * 根据指定季，获取该季下所有剧集
 */
export async function fetch_episodes_of_season_in_iqiyi(body: {
  tv_id: string | number;
  season_id: string | number;
  season_number: number;
}) {
  const { season_id } = body;
  const endpoint = `https://mesh.if.iqiyi.com/tvg/v2/selector`;
  const r = await iqiyi_request.get<{
    videos: {
      title: string;
      data: {
        page_url: string;
        play_show_status: number;
        multi_episode_order: number;
        play_url: string;
        pay_mark_url: string;
        image_url: string;
        short_display_name: string;
        title: string;
        pay_mark: number;
        mark_type_show: number;
        qipu_id: number;
        last_update_time: string;
        scaled_img_size: string[];
        content_type: number;
        subtitle: string;
        publish_date: string;
      }[];
    }[];
    entity_id: number;
  }>(endpoint, {
    album_id: season_id,
    timestamp: 1700659783827,
    src: "pcw_tvg",
    sign: "24FDB7C6BEE6561B219E252BCA9CC36F",
    user_id: "",
    vip_status: 0,
    auth_cookie: "",
    device_id: "4798183996645ebf3163434564f5252c",
    app_version: "6.1.0",
    scale: 200,
  });
  if (r.error) {
    return Result.Err(r.error);
  }
  const matched = r.data.videos[0];
  if (!matched) {
    return Result.Ok([]);
  }
  return Result.Ok(
    matched.data.map((episode, i) => {
      const { title, publish_date, page_url, image_url } = episode;
      return {
        name: title,
        episode_number: i + 1,
        air_date: publish_date,
        thumbnail: image_url,
      };
    })
  );
}

/**
 * 获取电视剧详情
 * @link https://developers.themoviedb.org/3/tv/get-tv-details
 * @param id 电视剧 tmdb id
 */
export async function fetch_tv_profile_in_iqiyi(id: string | number, query: RequestCommonPart) {
  if (id === undefined) {
    return Result.Err("请传入电视剧 id");
  }
  const endpoint = String(id);
  const { api_key } = query;
  const r = await iqiyi_request.get<string>(endpoint, {
    api_key,
  });
  if (r.error) {
    return Result.Err(r.error.message);
  }
  const data = r.data;
  const json_r = /window.Q.PageInfo.playPageInfo {0,1}= {0,1}(.+?);/;
  const json: {
    tvId: number;
    albumId: number;
    channelId: number;
    description: string;
    subtitle: string;
    imageUrl: string;
    categories: {
      id: number;
      qipuId: number;
      name: string;
      subType: number;
      lastUpdateTime: number;
      display: number;
      subName: string;
      parentId: number;
      childOrder: number;
      mainMelody: boolean;
      url: string;
    }[];
    albumName: string;
    people: {
      /** 嘉宾 */
      guest: {
        id: number;
        name: string;
        character: string[];
        image_url: string;
        paopao_summary: {
          circle_id: number;
          circle_id_type: string;
        };
      }[];
    };
  } | null = (() => {
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
  const season_res = await iqiyi_request.get<{
    data: {
      base_data: {
        _id: number;
        share_url: string;
        album_source_type: string;
        qipu_id: number;
        title: string;
        current_video_title: string;
        current_video_content_type: number;
        current_video_is_lock: boolean;
        is_classic_hd: boolean;
        current_video_year: string;
        ab_test_tag: string;
        board_info: {
          board_txt: string;
          board_order: number;
          related_temp: string;
          board_type: string;
        };
        business_type: unknown[];
        channel_id: number;
        heat: number;
        desc: string;
        feature_id: number;
        image_url: string;
        is_download_allowed: boolean;
        play_show_status: number;
        play_url: string;
        promote_vip_type: number;
        publish_date: string;
        label: {
          txt: string;
          type: number;
          style: string;
        }[];
        update_info: {
          update_notification: string;
          update_status: string;
          extra_tip: string;
          album_finish: boolean;
        };
        update_time: string;
        score_info: {
          user_score: null;
          user_score_count: null;
          sns_score: string;
          sns_star_number_info: {
            star_total_number: number;
            one_star_number: number;
            two_star_number: number;
            three_star_number: number;
            four_star_number: number;
            five_star_number: number;
          };
        };
        album_calendar: {
          start_update_time: string;
        };
        can_give: boolean;
        is_ugc: boolean;
        feature_count: number;
        show_interact_btn: boolean;
        total_episode: number;
        ai: {
          people_rec: boolean;
          bgm_rec: boolean;
        };
        warm_up: boolean;
        cloud_cinema: boolean;
        new_play_list: boolean;
        old_lib: boolean;
        can_favor: boolean;
      };
      template: {
        template_id: string;
        version: string;
        pure_data: {
          source_selector_bk: {
            videos:
              | string
              | {
                  title: string;
                  data: {
                    page_url: string;
                    play_show_status: number;
                    multi_episode_order: number;
                    play_url: string;
                    pay_mark_url: string;
                    image_url: string;
                    short_display_name: string;
                    title: string;
                    pay_mark: number;
                    mark_type_show: number;
                    qipu_id: number;
                    last_update_time: string;
                    scaled_img_size: string[];
                    content_type: number;
                    subtitle: string;
                    publish_date: string;
                  }[];
                }[];
            language: string;
            tab_name: string;
            order: number;
            entity_id: number;
            video_list_type: string;
            is_group: boolean;
          }[];
        };
      };
      msg: null;
    };
  }>("https://mesh.if.iqiyi.com/tvg/pcw/base_info", {
    entity_id: json.tvId,
    timestamp: 1700646581046,
    src: "pcw_tvg",
    vip_status: 0,
    vip_type: "",
    auth_cookie: "",
    device_id: "4798183996645ebf3163434564f5252c",
    user_id: "",
    app_version: "6.1.0",
    scale: 200,
    sign: "0293896B5060B512F6DE7513A8A6297F",
  });
  if (season_res.error) {
    return Result.Err(season_res.error.message);
  }
  const info = json;
  const season_data = season_res.data;
  console.log(season_data);
  const season_sources = season_data.data.template.pure_data.source_selector_bk.sort((a, b) => a.order - b.order);
  const seasons = [];
  for (let i = 0; i < season_sources.length; i += 1) {
    const { tab_name, entity_id, videos } = season_sources[i];
    const season = {
      id: entity_id,
      name: tab_name,
      air_date: null,
      // episodes:
      //   typeof videos === "string"
      //     ? []
      //     : videos.map((v, i) => {
      //         // @ts-ignore
      //         const { publish_date, title, image_url } = v;
      //         return {
      //           air_date: publish_date,
      //           name: title,
      //           order: i + 1,
      //           episode_number: i + 1,
      //           thumbnail: image_url,
      //         };
      //       }),
    };
    // await (async () => {
    //   if (typeof videos === "string") {
    //     const res = await request.get<{
    //       data: {
    //         videos: {
    //           title: string;
    //           data: {
    //             page_url: string;
    //             multi_episode_order: number;
    //             play_show_status: number;
    //             play_url: string;
    //             pay_mark_url: string;
    //             image_url: string;
    //             short_display_name: string;
    //             pay_mark: number;
    //             title: string;
    //             mark_type_show: number;
    //             qipu_id: number;
    //             last_update_time: string;
    //             scaled_img_size: string[];
    //             content_type: number;
    //             subtitle: string;
    //             publish_date: string;
    //           }[];
    //         }[];
    //         entity_id: number;
    //       };
    //     }>(videos);
    //     if (res.data) {
    //       season.episodes = res.data.data.videos[0]?.data.map((episode, i) => {
    //         const { publish_date, title, image_url } = episode;
    //         return {
    //           air_date: publish_date,
    //           name: title,
    //           order: i + 1,
    //           episode_number: i + 1,
    //           thumbnail: image_url,
    //         };
    //       });
    //     }
    //   }
    // })();
    // season.air_date = season.episodes[season.episodes.length - 1]?.air_date ?? null;
    seasons.push(season);
  }
  return Result.Ok({
    id,
    /** 中文片名 */
    name: info.albumName,
    /** 中文简介 */
    overview: null,
    poster_path: info.imageUrl,
    backdrop_path: null,
    /** 产地片名 */
    original_name: null,
    seasons,
    // in_production: json.videoMap.completed,
    first_air_date: (() => {
      return null;
    })(),
    vote_average: 0,
    popularity: 0,
    // number_of_episodes: json.videoMap.episodeTotal,
    number_of_seasons: seasons.length,
    status: null,
    genres: info.categories
      .filter((c) => c.subName === "类型")
      .map((t) => t.name)
      .map((t) => {
        return {
          id: t,
          name: t,
        };
      }),
    origin_country: info.categories
      .filter((c) => c.subName === "地区")
      .map((area) => {
        return MEDIA_COUNTRY_MAP[area.name];
      })
      .filter(Boolean),
  });
}
export type TVProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_tv_profile_in_iqiyi>>>;
export type PartialSeasonFromTMDB = TVProfileFromTMDB["seasons"][number];

/**
 * 获取电视剧某一季详情
 * @link https://developers.themoviedb.org/3/tv/get-tv-details
 * @param number 第几季
 */
export async function fetch_season_profile(season_id: string, options: RequestCommonPart) {
  const season_res = await iqiyi_request.get<{
    data: {
      base_data: {
        _id: number;
        share_url: string;
        album_source_type: string;
        qipu_id: number;
        title: string;
        current_video_title: string;
        current_video_content_type: number;
        current_video_is_lock: boolean;
        is_classic_hd: boolean;
        current_video_year: string;
        ab_test_tag: string;
        board_info: {
          board_txt: string;
          board_order: number;
          related_temp: string;
          board_type: string;
        };
        business_type: unknown[];
        channel_id: number;
        heat: number;
        desc: string;
        feature_id: number;
        image_url: string;
        is_download_allowed: boolean;
        play_show_status: number;
        play_url: string;
        promote_vip_type: number;
        publish_date: string;
        label: {
          txt: string;
          type: number;
          style: string;
        }[];
        update_info: {
          update_notification: string;
          update_status: string;
          extra_tip: string;
          album_finish: boolean;
        };
        update_time: string;
        score_info: {
          user_score: null;
          user_score_count: null;
          sns_score: string;
          sns_star_number_info: {
            star_total_number: number;
            one_star_number: number;
            two_star_number: number;
            three_star_number: number;
            four_star_number: number;
            five_star_number: number;
          };
        };
        album_calendar: {
          start_update_time: string;
        };
        can_give: boolean;
        is_ugc: boolean;
        feature_count: number;
        show_interact_btn: boolean;
        total_episode: number;
        ai: {
          people_rec: boolean;
          bgm_rec: boolean;
        };
        warm_up: boolean;
        cloud_cinema: boolean;
        new_play_list: boolean;
        old_lib: boolean;
        can_favor: boolean;
      };
      template: {
        template_id: string;
        version: string;
        pure_data: {
          source_selector_bk: {
            videos:
              | string
              | {
                  title: string;
                  data: {
                    page_url: string;
                    play_show_status: number;
                    multi_episode_order: number;
                    play_url: string;
                    pay_mark_url: string;
                    image_url: string;
                    short_display_name: string;
                    title: string;
                    pay_mark: number;
                    mark_type_show: number;
                    qipu_id: number;
                    last_update_time: string;
                    scaled_img_size: string[];
                    content_type: number;
                    subtitle: string;
                    publish_date: string;
                  }[];
                }[];
            language: string;
            tab_name: string;
            order: number;
            entity_id: number;
            video_list_type: string;
            is_group: boolean;
          }[];
        };
      };
      msg: null;
    };
  }>("https://mesh.if.iqiyi.com/tvg/pcw/base_info", {
    entity_id: season_id,
    timestamp: 1700646581046,
    src: "pcw_tvg",
    vip_status: 0,
    vip_type: "",
    auth_cookie: "",
    device_id: "4798183996645ebf3163434564f5252c",
    user_id: "",
    app_version: "6.1.0",
    scale: 200,
    sign: "0293896B5060B512F6DE7513A8A6297F",
  });
  if (season_res.error) {
    return Result.Err(season_res.error.message);
  }
  // const season_data = season_res.data;
  // const season_sources = season_data.data.template.pure_data.source_selector_bk.sort((a, b) => a.order - b.order);
  return Result.Ok({});
}
export type SeasonProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_season_profile>>>;

/**
 * 获取电视剧某一集详情
 * @param number 第几季
 */
export async function fetch_episode_profile_in_iqiyi(
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
  const result = await iqiyi_request.get<{
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

export type EpisodeProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_episode_profile_in_iqiyi>>>;

/**
 * 获取电视剧详情
 * @link https://developers.themoviedb.org/3/tv/get-tv-details
 * @param id 电视剧 tmdb id
 */
export async function fetch_movie_profile_in_iqiyi(id: number | undefined, query: RequestCommonPart) {
  if (id === undefined) {
    return Result.Err("请传入电影 id");
  }
  const endpoint = `/movie/${id}`;
  const { api_key } = query;
  const r = await iqiyi_request.get<{
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
export type MovieProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_movie_profile_in_iqiyi>>>;
