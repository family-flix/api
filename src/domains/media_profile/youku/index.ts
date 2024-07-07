/**
 * @file 优酷
 */
import dayjs from "dayjs";
import axios from "axios";

import { Result } from "@/domains/result/index";
import { MEDIA_COUNTRY_MAP, MEDIA_GENRES_MAP } from "@/constants";

import {
  fetch_tv_profile_in_youku,
  fetch_movie_profile,
  search_media_in_youku,
  search_movie_in_tmdb,
  update_cookie,
  request,
  YoukuProfilePageInfo,
  YoukuSeasonProfileResp,
  YoukuEpisodeProfileResp,
} from "./services";
import { format_season_profile, get_sign, update_token } from "./utils";

const GLOBAL_TOKEN = {
  cookie: "",
  token: "",
  expired: 0,
};
function set_cookie(cookie: string) {
  GLOBAL_TOKEN.cookie = cookie;
}
function set_token(token: string) {
  GLOBAL_TOKEN.token = token;
}

export class YoukuClient {
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
  async fetch_token() {
    const response = await axios.head("https://acs.youku.com/h5/mtop.ykrec.recommendservice.recommend/1.0/", {
      params: {
        jsv: "2.6.1",
        appKey: "24679788",
        t: "1701224407059",
        sign: "0319217691a8eae04657abd83140bb11",
        api: "mtop.ykrec.RecommendService.recommend",
        v: "1.0",
        dataType: "json",
        jsonpIncPrefix: "headerSearch1701224406991",
        type: "originaljson",
        data: '{"appid":"14177","mtopParams":"{\\"count\\":\\"1\\",\\"channel\\":\\"PC\\",\\"fr\\":\\"pc\\",\\"app_source\\":\\"main_page\\",\\"x_utdid\\":\\"XlQcF5xQrCcCAWoLKdGqIOhS\\"}","utdid":"XlQcF5xQrCcCAWoLKdGqIOhS"}',
      },
      headers: {
        Accept: "application/json",
        "Accept-Language": "zh-CN,zh;q=0.9",
        Connection: "keep-alive",
        "Content-type": "application/x-www-form-urlencoded",
        Cookie: "isI18n=false",
        Origin: "https://www.youku.com",
        Referer: "https://www.youku.com/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "sec-ch-ua": '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
      },
    });
    const c = response.headers["set-cookie"];
    const cookies = c
      ? c
          .map((text) => {
            const segments = text.split(";");
            return segments
              .map((s) => {
                const [k, v] = s.trim().split("=");
                if (k === "Expires") {
                  return {
                    [k]: dayjs(v).valueOf(),
                  };
                }
                return { [k]: v };
              })
              .reduce((a, b) => {
                return {
                  ...a,
                  ...b,
                };
              }, {});
          })
          .reduce((a, b) => {
            return {
              ...a,
              ...b,
            };
          }, {})
      : [];
    // @ts-ignore
    const { _m_h5_tk, _m_h5_tk_enc, Expires } = cookies;
    // GLOBAL_TOKEN.cookie =
    //   "isI18n=false; _m_h5_tk=932c0584a1e938afe486173318c72189_1701229267317; _m_h5_tk_enc=cc76a4b554476baf744128f059ae49b3; cna=1o3tHedpvXMCAbeBpypXiVpz; __ysuid=1701224408287Xdg; __ayft=1701224408289; __aysid=1701224408289II4; __ayscnt=1; xlly_s=1; __arpvid=1701227405540a7cFGl-1701227405615; __arycid=dd-3-00; __arcms=dd-3-00; __aypstp=2; __ayspstp=2; __ayvstp=534; __aysvstp=534; isg=BENDggwuIsyq6e64-omE2crp0gHtuNf6Gn6KQnUgyaIZNGJW_YjeS4rlrsR6vS_y; l=fBjg00f4PFXp7W1xBOfZFurza77tLIRXnuPzaNbMi9fPO77e5LwcW1EyOAdwCnGVEsFvR3zzwi5HB78LOyzsQxv9-e_JvlIIndLnwpzHU; tfstk=dbeWKKxI_ye4qrGpUTs45pMWAakBez6ZAHiLjkpyvYHJJeEtu3ur4zJLGyUma4eQxpiLvyjo8gf4quDnpN7adOruqGxJDizAujkFIT7N7OWNwnHCPNPPxrpFXQSG9EKYxt9kUpgBV-dCarduH0GSRpuXd1jE2bgT2q6V3OzvQV_nBBtjspij7isXtBcnhZeP.";
    // GLOBAL_TOKEN.token = "932c0584a1e938afe486173318c72189";
    GLOBAL_TOKEN.cookie = `isI18n=false; _m_h5_tk=${_m_h5_tk}; _m_h5_tk_enc=${_m_h5_tk_enc}; cna=1o3tHedpvXMCAbeBpypXiVpz; __ysuid=1701224408287Xdg; __ayft=1701224408289; __aysid=1701224408289II4; __ayscnt=1; xlly_s=1; __arpvid=1701227405540a7cFGl-1701227405615; __arycid=dd-3-00; __arcms=dd-3-00; __aypstp=2; __ayspstp=2; __ayvstp=534; __aysvstp=534; isg=BENDggwuIsyq6e64-omE2crp0gHtuNf6Gn6KQnUgyaIZNGJW_YjeS4rlrsR6vS_y; l=fBjg00f4PFXp7W1xBOfZFurza77tLIRXnuPzaNbMi9fPO77e5LwcW1EyOAdwCnGVEsFvR3zzwi5HB78LOyzsQxv9-e_JvlIIndLnwpzHU; tfstk=dbeWKKxI_ye4qrGpUTs45pMWAakBez6ZAHiLjkpyvYHJJeEtu3ur4zJLGyUma4eQxpiLvyjo8gf4quDnpN7adOruqGxJDizAujkFIT7N7OWNwnHCPNPPxrpFXQSG9EKYxt9kUpgBV-dCarduH0GSRpuXd1jE2bgT2q6V3OzvQV_nBBtjspij7isXtBcnhZeP.`;
    GLOBAL_TOKEN.token = _m_h5_tk.split("_")[0];
    GLOBAL_TOKEN.expired = Expires;
    update_cookie(GLOBAL_TOKEN.cookie);
    update_token(GLOBAL_TOKEN.token);
    return Result.Ok(GLOBAL_TOKEN);
  }

  async fetch_profile_page(url: string) {
    // const r = await request.get<string>(url);
    const r = await axios.get(url, {
      headers: {
        authority: "v.youku.com",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        "cache-control": "max-age=0",
        cookie:
          "P_F=1; cna=TyNmHYeaUmcCAXPuK4Jgz6e+; __ysuid=1701224362654Hkg; __ayft=1701224362655; __aysid=1701224362655Orn; __ayscnt=1; isI18n=false; xlly_s=1; _m_h5_tk=e2405f6e418492cff3bc30dcee692046_1701260938677; _m_h5_tk_enc=6f3bd37dff0c177d468e2f91ad96cdde; __arycid=dd-3-00; __arcms=dd-3-00; x5sec=7b22617365727665722d686579693b32223a223334393163386532373239356163383564303433373632646332396165666234434d43346e4b7347454a573278386b434d494b42384d37342f2f2f2f2f77464141773d3d222c22733b32223a2234393335656535666334373639616564227d; __arpvid=1701256260996GQqQbx-1701256261031; __aypstp=17; __ayspstp=17; __ayvstp=33; __aysvstp=33; l=fBLaaDX7NtjJgH0oBOfaPurza779QIRvjuPzaNbMi9fPtM5y5u0AW1EuS0L2CnGVFsawR3zzwi5HBeYBchbYXeQ2zvbLmoDmnmOk-Wf..; tfstk=drtWSswC7BKqWF_L40M21yagv_sCVQiN9J6pIpEzpgI8JE9yizSPUpCBOI508bfyYBNdMQtEZkvnRovycpkR9p0LO9tme4eJpJ6pgIdC-YfF96OepUkqbcJkEMjpOfoZbLC5xMpSIy2BELjhv-PK7EpuACQvHGwt4S0qsLlbmorCtrYB87Kpbn65kqJRMy5XcT_56LdUvO7Yb1GhXywfSk6f_xMb-ybhcjKP.; isg=BMzMkDYdxXg-MNATepzqD_iInSz-BXCveZsVHyaNyncasWy7ThVAPggLUbmJ0qgH",
        referer:
          "https://v.youku.com//v_show/id_1530521967.html/_____tmd_____/punish?x5secdata=xcQoEfkuEl8Bb1q2Y2I0MrLbjrtHiWbgzsGqHvh4HugBMWadRTkexu0RjlpXwcHeQgA51jEp7%2fjyHV6PzHmD6JBlakBIuJK1y%2bX7Q6CvL4tVubPfW0TIegLgCU3YrwMR9yeKQixA%2fiUxDZNnelTbC0kj%2fGqZ%2fo0TXQgIdoTXApJ9bYOchXeMnGWp6gb5jU75d0yvd%2bIqrub0sjvtF69jaw80P4gKb9tuGLlu38OxaRf9I%3d__bx__v.youku.com%2fv_show%2fid_1530521967.html&x5step=1",
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
    const data = r.data;
    const json_r = /window.__INITIAL_DATA__ =([^;]{1,});/;
    const json: YoukuProfilePageInfo | null = (() => {
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
    return Result.Ok(json.data.data);
  }
  async fetch_episode_profile_api(episode_id: string, season_id: string | number) {
    await this.initialize();
    const t = new Date().getTime();
    const k = 24679788;
    const query = {
      jsv: "2.6.1",
      appKey: k,
      t,
      sign: "",
      api: "mtop.youku.columbus.gateway.new.execute",
      type: "originaljson",
      v: "1.0",
      ecode: 1,
      dataType: "json",
      data: JSON.stringify({
        ms_codes: "2019030100",
        params: JSON.stringify({
          biz: "new_detail_web2",
          componentVersion: "3",
          debug: 0,
          gray: 0,
          ip: "183.129.167.42",
          platform: "pc",
          scene: "web_page",
          showId: season_id,
          source: "pcNoPrev",
          userId: 0,
          utdid: "TyNmHYeaUmcCAXPuK4Jgz6e+",
          videoId: episode_id,
        }),
        system_info: JSON.stringify({
          os: "pc",
          device: "pc",
          ver: "1.0.0",
          appPackageKey: "pcweb",
          appPackageId: "pcweb",
        }),
      }),
    };
    query.sign = get_sign({
      t,
      d: query.data,
    });
    const url = "https://acs.youku.com/h5/mtop.youku.columbus.gateway.new.execute/1.0/";
    const r = await request.get<YoukuEpisodeProfileResp>(url, query);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    if (!r.data.data["2019030100"]) {
      return Result.Err(r.data.ret[0]);
    }
    const profile = r.data.data["2019030100"].data;
    return Result.Ok(profile);
  }
  async initialize() {
    if (GLOBAL_TOKEN.expired === 0) {
      return this.fetch_token();
    }
    if (dayjs().valueOf() > GLOBAL_TOKEN.expired) {
      return this.fetch_token();
    }
    return Result.Ok(GLOBAL_TOKEN);
  }

  async fetch_profile_with_seasons(u: string) {
    await this.initialize();
    const profile_r = await this.fetch_profile_page(u);
    if (profile_r.error) {
      return Result.Err(profile_r.error.message);
    }
    const profile = profile_r.data;
    const r = format_season_profile(profile);
    return Result.Ok({
      platform: "youku",
      ...r,
    });
  }

  /** 根据关键字搜索电视剧 */
  async search(keyword: string) {
    return search_media_in_youku(keyword, {});
  }
  /** 根据关键字搜索电视剧 */
  async search_tv(keyword: string, extra: Partial<{ page: number; language: "zh-CN" | "en-US" }> = {}) {
    const { token } = this.options;
    const { page } = extra;
    return search_media_in_youku(keyword, {
      page,
    });
  }
  /** 获取电视剧详情 */
  async fetch_tv_profile(id: number | string) {
    const { token } = this.options;
    const result = await fetch_tv_profile_in_youku(id, {
      api_key: token,
    });
    return result;
  }
  /** 获取季详情 */
  async fetch_season_profile(season_id: string | number) {
    await this.initialize();
    const t = new Date().getTime();
    const k = 24679788;
    const query = {
      jsv: "2.6.1",
      appKey: k,
      t,
      sign: "",
      api: "mtop.youku.columbus.gateway.new.execute",
      type: "originaljson",
      v: "1.0",
      ecode: 1,
      dataType: "json",
      data: JSON.stringify({
        ms_codes: "2019030100",
        params: JSON.stringify({
          biz: "new_detail_web2",
          componentVersion: "3",
          debug: 0,
          gray: 0,
          ip: "183.129.167.42",
          nextSession: JSON.stringify({
            id: 239036,
            index: 2,
            lastPageNo: 0,
            lastSubId: 1529211084,
            lastSubIndex: 20,
            level: 2,
            lifecycle: 1,
            pageId: "PCSHOW_VARIETY_NORMAL",
            pageName: "page_playpage",
            scmA: "20140719",
            scmB: "manual",
            scmC: "239036",
            spmA: "a2h08",
            spmB: "8165823",
            spmC: "1_3",
          }),
          platform: "pc",
          scene: "component",
          showId: season_id,
          userId: "",
          utdid: "TyNmHYeaUmcCAXPuK4Jgz6e+",
        }),
        system_info: JSON.stringify({
          os: "pc",
          device: "pc",
          ver: "1.0.0",
          appPackageKey: "pcweb",
          appPackageId: "pcweb",
        }),
      }),
    };
    query.sign = get_sign({
      t,
      d: query.data,
    });
    const url = "https://acs.youku.com/h5/mtop.youku.columbus.gateway.new.execute/1.0/";
    const r = await request.get<YoukuSeasonProfileResp>(url, query);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    if (!r.data.data["2019030100"]) {
      return Result.Err(r.data.ret[0]);
    }
    const p1 = r.data.data["2019030100"].data;
    const { stageTabs, lastStage } = p1.data;
    // console.log("p1.data", p1.data);
    const range = (() => {
      if (lastStage) {
        return [1, lastStage];
      }
      if (!stageTabs) {
        return null;
      }
      const first = stageTabs[0];
      const last = stageTabs[stageTabs.length - 1];
      return [first.itemStartStage, last.itemEndStage];
    })();
    // console.log(range);
    const t2 = new Date().getTime();
    const query2 = {
      jsv: "2.6.1",
      appKey: k,
      t: t2,
      sign: "",
      api: "mtop.youku.columbus.gateway.new.execute",
      type: "originaljson",
      v: "1.0",
      ecode: 1,
      dataType: "json",
      data: JSON.stringify({
        ms_codes: "2019030100",
        params: JSON.stringify({
          biz: "new_detail_web2",
          componentVersion: "3",
          ip: "183.129.167.42",
          debug: 0,
          utdid: "TyNmHYeaUmcCAXPuK4Jgz6e+",
          userId: "",
          platform: "pc",
          gray: 0,
          scene: "component",
          nextSession: JSON.stringify({
            id: 239036,
            index: 2,
            lastPageNo: 0,
            lastSubId: 1529211084,
            lastSubIndex: 20,
            level: 2,
            lifecycle: 1,
            itemStartStage: range?.[0],
            itemEndStage: range?.[1],
            // itemStartStage: 36,
            // itemEndStage: 70,
            // pageId: "PCSHOW_VARIETY_NORMAL",
            pageId: "PCSHOW_ANIME_NORMAL",
            pageName: "page_playpage",
            scmA: "20140719",
            scmB: "manual",
            scmC: "239036",
            spmA: "a2h08",
            spmB: "8165823",
            spmC: "1_3",
          }),
          showId: season_id,
        }),
        system_info: JSON.stringify({
          os: "pc",
          device: "pc",
          ver: "1.0.0",
          appPackageKey: "pcweb",
          appPackageId: "pcweb",
        }),
      }),
    };
    query2.sign = get_sign({
      t: t2,
      d: query2.data,
    });
    const r2 = await request.get<YoukuSeasonProfileResp>(url, query2);
    if (r2.error) {
      return Result.Err(r2.error.message);
    }
    if (!r2.data.data["2019030100"]) {
      return Result.Err(r2.data.ret[0]);
    }
    const p2 = r2.data.data["2019030100"].data;
    const latest_episode = p2.nodes[0];
    if (!latest_episode) {
      return Result.Err("没有获取到剧集");
    }
    // console.log(p2.nodes);
    const r3 = await this.fetch_episode_profile_api(latest_episode.data.action.value, season_id);
    if (r3.error) {
      return Result.Err(r3.error.message);
    }
    const p3 = r3.data;
    // console.log(p3);
    const TYPE_MAP: Record<string, string> = {
      电影: "movie",
      综艺: "season",
    };
    const base_node = p3.nodes.find((n) => n.type === 10001);
    if (!base_node) {
      return Result.Err("缺少 base_node 信息");
    }
    const payload = {
      id: p3.data.extra.showId,
      name: p3.data.extra.showName,
      overview: null as null | string,
      poster_path: p3.data.extra.showImgV,
      air_date: dayjs(p3.data.extra.showReleaseTime).format("YYYY-MM-DD"),
      genres: [p3.data.extra.showCategory].map((n) => MEDIA_GENRES_MAP[n]).filter(Boolean),
      origin_country: [] as string[],
      persons: [] as {
        id: string;
        name: string;
        avatar: string;
      }[],
    };
    const intro_node = (() => {
      const a = base_node.nodes.find((n) => n.type === 20009);
      if (!a) {
        return null;
      }
      const b = a.nodes.find((n) => n.type === 20010);
      if (!b) {
        return null;
      }
      return b.data;
    })();
    if (intro_node) {
      payload.overview = intro_node.desc;
      payload.origin_country = [intro_node.introSubTitle.split("·")[0]]
        .filter(Boolean)
        .map((n) => MEDIA_COUNTRY_MAP[n]);
    }
    const PERSON_TYPE: Record<string, string> = {
      主持人: "host",
      嘉宾: "guest",
      导演: "director",
      主演: "main_charetors",
      演员: "actor",
    };
    const person_node = (() => {
      const a = base_node.nodes.find((n) => n.type === 20009);
      if (!a) {
        return null;
      }
      const b = a.nodes.filter((n) => n.type === 10011);
      if (!b) {
        return [];
      }
      return b.map((p) => {
        const {
          data: { personId, img, title, subtitle },
        } = p;
        return {
          id: personId,
          name: title,
          avatar: img,
          character: [],
          department: PERSON_TYPE[subtitle],
        };
      });
    })();
    const episodes = p2.nodes.map((node, i) => {
      const { action, stage, title, img } = node.data;
      return {
        id: action?.value || node.id,
        name: title,
        thumbnail: img,
        episode_number: stage || i + 1,
        air_date: String(stage).match(/[0-9]{8}/)
          ? String(stage).replace(/([0-9]{4})([0-9]{2})([0-9]{2})/, "$1-$2-$3")
          : null,
      };
    });
    return Result.Ok({
      type: TYPE_MAP[p3.data.extra.videoCategory] || "season",
      id: payload.id,
      name: payload.name,
      overview: payload.overview,
      poster_path: payload.poster_path,
      air_date: payload.air_date,
      // air_date: episodes[0]?.air_date ?? null,
      backdrop_path: null,
      original_name: null,
      episodes,
      genres: payload.genres,
      origin_country: payload.origin_country,
      persons: person_node,
    });
  }
  /** 获取剧集详情 */
  // async fetch_episode_profile(body: {
  //   tv_id: string | number;
  //   season_number: string | number;
  //   episode_number: string | number;
  // }) {
  //   const { token } = this.options;
  //   const { tv_id, season_number, episode_number } = body;
  //   const result = await fetch_episode_profile(
  //     {
  //       tv_id,
  //       season_number,
  //       episode_number,
  //     },
  //     {
  //       api_key: token,
  //     }
  //   );
  //   return result;
  // }
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
