/**
 * @file 优酷 搜索
 */
import axios from "axios";
import cheerio from "cheerio";

import { Result, resultify, UnpackedResult } from "@/domains/result/index";
import { Unpacked } from "@/types";
import { MEDIA_SOURCE_MAP, MEDIA_TYPE_MAP, MEDIA_COUNTRY_MAP } from "@/constants";
import { parse_filename_for_video } from "@/utils/parse_filename_for_video";
import { query_stringify } from "@/utils";

import { SearchedTVItem } from "../types";

export type Language = "zh-CN" | "en-US";
export type RequestCommonPart = {
  api_key?: string;
};
let cookie = "";
export function update_cookie(c: string) {
  cookie = c;
}
const client = axios.create({
  timeout: 6000,
});
type RequestClient = {
  get: <T>(url: string, query?: Record<string, string | number | undefined>) => Promise<Result<T>>;
  post: <T>(url: string, body: Record<string, string | number | undefined>) => Promise<Result<T>>;
};
export const request: RequestClient = {
  get: async <T extends null>(endpoint: string, query: Record<string, string | number | undefined> = {}) => {
    try {
      const url = endpoint;
      let u = url;
      const resp = await axios.get(u, {
        params: query,
        headers: {
          authority: "v.youku.com",
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
          cookie,
          "sec-ch-ua": '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
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
      // console.log("[LOG](request)", "post", API_HOST + endpoint, body);
      const resp = await client.post(endpoint, body, {
        headers: {},
      });
      return Result.Ok<T>(resp.data);
    } catch (err) {
      const error = err as Error;
      return Result.Err(error.message);
    }
  },
};

export type YoukuProfilePageInfo = {
  config: {
    main: Record<
      number,
      {
        key: string;
        channelName: string;
        name: string;
        playlistCateID: number;
        channelurl: string;
      }
    >;
    simpleMode: boolean;
    environment: string;
    isTudou: boolean;
    origin: string;
    url: string;
    componentMap: {
      focus: {
        key: string;
        value: number;
        name: string;
        medusaKey: string;
      };
      focus2: {
        key: string;
        value: number;
        name: string;
        medusaKey: string;
      };
      typeConf: {
        playlistAuthor: number;
        scgLongVideo: number;
        series: number;
      };
      listView: {
        key: string;
        value: number;
        name: string;
      }[];
      topManu: {
        体育: {
          tags: {
            key: string;
            value: number[];
            name: string;
          }[];
        };
        default: {
          scg: {
            key: string;
            value: number[];
            name: string;
            medusaKey: string;
          };
          playlist: {
            key: string;
            value: number[];
            name: string;
            medusaKey: string;
          };
          single: {
            key: string;
            value: number[];
            name: string;
          };
          show: {
            key: string;
            value: number;
            name: string;
            medusaKey: string;
          };
        };
        电视剧: {
          tags: {
            key: string;
            value: number;
            name: string;
            medusaKey: string;
          }[];
        };
        动漫: {
          tags: {
            key: string;
            value: number;
            name: string;
            medusaKey: string;
          }[];
        };
        电影: {
          tags: {
            key: string;
            value: number[];
            name: string;
            medusaKey: string;
          }[];
        };
        综艺: {
          tags: {
            key: string;
            value: string;
            name: string;
            medusaKey: string;
          }[];
        };
      };
      key: string;
      btmapping: {
        BohVideoInfo: number;
        BohStar: number;
        BohAlbum: number;
        BohSurroundings: number;
        BohRecommend: number;
        BohComment: number;
        BohAdvert: number;
      };
      top: {
        ad: number;
        detail: number;
        anthology: number;
        segments: number;
        focus: number;
        playlist: number;
        single: number;
        score: number;
        series: number;
        playback: number;
      };
    };
    query: {
      spm: string;
      scm: string;
    };
    source: {
      serverJS: {
        url: string;
        urlI18n: string;
        oldurl: string;
      };
      jslibSDK: {
        url: string;
      };
      playerSDK: {
        url: string;
      };
      playerCore: {
        url: string;
      };
      baxiaSDK: {
        url: string;
      };
      xDeviceSDK: {
        url: string;
      };
      xDecoderSDK: {
        url: string;
      };
      padPlayerSDK: {
        url: string;
      };
      adProductH5sdk: {
        url: string;
      };
      vipPaySDK: {
        url: string;
      };
      pageRuntimeSDK: {
        url: string;
        urlI18n: string;
        oldurl: string;
      };
      pageChunkSDK: {
        url: string;
        urlI18n: string;
        oldurl: string;
      };
      pageChunkCss: {
        url: string;
        urlI18n: string;
        oldurl: string;
      };
      pageADSDK: {
        url: string;
      };
      previewPlaySDK: {
        url: string;
      };
      barrageCss: {
        url: string;
      };
      barrageSDK: {
        url: string;
      };
    };
    renderType: string;
    ip: string;
    cna: string;
    device: string;
    env: string;
    staticConf: {
      isSSR: boolean;
      offlineMode: boolean;
      downloadMode: boolean;
      serverJS: string;
      jslibSDK: string;
      playerSDK: string;
      playerCore: string;
      padPlayerSDK: string;
      adProductH5sdk: string;
      vipPaySDK: string;
      pageRuntimeSDK: string;
      pageChunkSDK: string;
      pageChunkCss: string;
      pageADSDK: string;
      previewPlaySDK: string;
      barrageCss: string;
      barrageSDK: string;
    };
    isOpenClientCDNPriming: boolean;
    isSimulateMTOPError: boolean;
    clientIsJump404: boolean;
    biz: string;
    serverUserId: string;
    offlineMode: boolean;
    downloadMode: boolean;
    politicsHandleLevel: number;
    playerConfig: {
      loginPlay: boolean;
      vid: string;
    };
    IKUVersion: string;
    sidebarSwitchWidth: number;
    isExpScope: boolean;
    isNewVersion: boolean;
  };
  data: {
    success: boolean;
    msCode: string;
    errorCode: null;
    errorMsg: null;
    data: {
      id: number;
      level: number;
      type: number;
      typeName: string;
      more: boolean;
      traceId: string;
      style: null;
      render: null;
      data: {
        title: string;
        session: string;
        extra: {
          videoId: string;
          videoLongId: number;
          videoCategoryId: number;
          videoCategory: string;
          videoType: string;
          videoTypeCode: null;
          videoImg: string;
          videoImgV: string;
          showVideoStage: number;
          videoPublishTime: string;
          videoTitle: string;
          showVideoStageDesc: string;
          showId: string;
          showLongId: number;
          showCategoryId: number;
          showCategory: string;
          episodeTotal: number;
          showName: string;
          showSubtitle: string;
          completed: boolean;
          showImg: string;
          showImgV: string;
          episodeLast: number;
          showReleaseTime: string;
          episodeFinalStage: number;
          playlistId: null;
          playlistLongId: null;
          playlistTitle: null;
          scgId: null;
          userId: null;
          allowComment: boolean;
          allowShare: boolean;
          allowDownload: boolean;
          allowLike: boolean;
          isFavorite: boolean;
          reportUrl: string;
          pageKey: string;
          prePaid: null;
          paid: number;
          duration: number;
          totalComment: number;
          totalUp: number;
          verticalStyle: null;
          isNewReservation: boolean;
          politicsSensitive: null;
          interactiveChapter: null;
          playingType: null;
          isTracking: boolean;
          isPugv: boolean;
          adRestricted: number;
          autoPay: boolean;
          albumId: null;
          microVideoSchema: null;
          videoRiskMark: null;
          audiolang: unknown[];
          videoSizes: null;
          downloadStatus: unknown[];
          videoKind: null;
          subCategories: null;
          hasVideoType: null;
          animeEdition: null;
          videoCacheConfig: {
            resourceId: string;
            downloadStatus: string;
            toastText: string;
            buttonDesc: string;
            isVipUser: null;
            icon: {
              imgUrl: null;
              text: null;
              bgColor: null;
            };
          };
          showPackageType: null;
          videoPackageType: null;
          showLibraryTag: number[];
          videoLibraryTag: number[];
          streamTypes: string[];
          safetyContentElement: null;
        };
      };
      nodes: {
        id: number;
        /** 第一层级 */
        level: number;
        type: number;
        typeName: string;
        more: boolean;
        traceId: string;
        style: null;
        render: null;
        data: {
          session: string;
        };
        nodes: {
          id: number;
          /** 第二层级 */
          level: number;
          type: number;
          typeName: string;
          more: boolean;
          traceId: string;
          style: null;
          render: null;
          data: {
            session: string;
            subtitle: string;
            allowPlay: number;
            action: {
              type: string;
              value: null;
              contentType: null;
              contentValue: null;
              reportDisabled: boolean;
              extra: null;
              callback: null;
              reportConfig: null;
              report: {
                pageName: string;
                arg1: string;
                spmAB: string;
                spmC: string;
                spmD: string;
                scmAB: string;
                scmC: string;
                scmD: string;
                index: number;
                reportDataOpt: boolean;
                trackInfo: {
                  component_id: string;
                  pvv_vid: string;
                  component_instance_id: number;
                  utdid: string;
                  servertime: number;
                  pageid: string;
                  lifecycle: number;
                  drawerid: string;
                  pvv_sid: string;
                  cms_req_id: string;
                };
                utParam: null;
              };
            };
            allowRefresh: number;
            title: string;
            /** 季列表 */
            series: {
              title: string;
              showId: string;
              showLongId: number;
              lastEpisodeVideoId: string;
              current: boolean;
            }[];
          };
          nodes: {
            id: number;
            /** 第三层级 */
            level: number;
            type: number;
            typeName: string;
            more: boolean;
            traceId: string;
            style: null;
            render: null;
            data: {
              heat: number;
              updateInfo: string;
              showImgV: string;
              introTitle: string;
              mark: {
                type: string;
                data: {
                  text: string;
                  color: string;
                  iconfont: null;
                  colorValue: null;
                  img: null;
                  img2: null;
                  ratio: null;
                  imgList: null;
                };
              };
              introSubTitle: string;
              desc: string;
              personId: number;
              title: string;
              subtitle: string;
              stage: number;
              summary: string;
              img: string;
            };
            nodes: null;
            layout: null;
            header: null;
            contentId: null;
            raxConfig: null;
            config: null;
          }[];
          layout: null;
          header: null;
          contentId: null;
          raxConfig: null;
          config: null;
        }[];
        layout: null;
        header: null;
        contentId: null;
        raxConfig: null;
        config: null;
      }[];
      layout: null;
      header: null;
      contentId: null;
      raxConfig: null;
      config: null;
    };
    debugInfo: null;
    headers: {
      stat_req_episode: string;
      manufacturingDate: string;
      stat_c_10013: string;
    };
    model: {
      detail: {
        data: {
          id: number;
          level: number;
          type: number;
          typeName: string;
          more: boolean;
          traceId: string;
          style: null;
          render: null;
          data: {
            title: string;
            session: string;
            extra: {
              videoId: string;
              videoLongId: number;
              videoCategoryId: number;
              videoCategory: string;
              videoType: string;
              videoTypeCode: null;
              videoImg: string;
              videoImgV: string;
              showVideoStage: number;
              videoPublishTime: string;
              videoTitle: string;
              showVideoStageDesc: string;
              showId: string;
              showLongId: number;
              showCategoryId: number;
              showCategory: string;
              episodeTotal: number;
              showName: string;
              showSubtitle: string;
              completed: boolean;
              showImg: string;
              showImgV: string;
              episodeLast: number;
              showReleaseTime: string;
              episodeFinalStage: number;
              playlistId: null;
              playlistLongId: null;
              playlistTitle: null;
              scgId: null;
              userId: null;
              allowComment: boolean;
              allowShare: boolean;
              allowDownload: boolean;
              allowLike: boolean;
              isFavorite: boolean;
              reportUrl: string;
              pageKey: string;
              prePaid: null;
              paid: number;
              duration: number;
              totalComment: number;
              totalUp: number;
              verticalStyle: null;
              isNewReservation: boolean;
              politicsSensitive: null;
              interactiveChapter: null;
              playingType: null;
              isTracking: boolean;
              isPugv: boolean;
              adRestricted: number;
              autoPay: boolean;
              albumId: null;
              microVideoSchema: null;
              videoRiskMark: null;
              audiolang: unknown[];
              videoSizes: null;
              downloadStatus: unknown[];
              videoKind: null;
              subCategories: null;
              hasVideoType: null;
              animeEdition: null;
              videoCacheConfig: {
                resourceId: string;
                downloadStatus: string;
                toastText: string;
                buttonDesc: string;
                isVipUser: null;
                icon: {
                  imgUrl: null;
                  text: null;
                  bgColor: null;
                };
              };
              showPackageType: null;
              videoPackageType: null;
              showLibraryTag: number[];
              videoLibraryTag: number[];
              streamTypes: string[];
              safetyContentElement: null;
            };
          };
          nodes: {
            id: number;
            level: number;
            type: number;
            typeName: string;
            more: boolean;
            traceId: string;
            style: null;
            render: null;
            data: {
              session: string;
            };
            nodes: {
              id: number;
              level: number;
              type: number;
              typeName: string;
              more: boolean;
              traceId: string;
              style: null;
              render: null;
              data: {
                session: string;
                subtitle: string;
                allowPlay: number;
                action: {
                  type: string;
                  value: null;
                  contentType: null;
                  contentValue: null;
                  reportDisabled: boolean;
                  extra: null;
                  callback: null;
                  reportConfig: null;
                  report: {
                    pageName: string;
                    arg1: string;
                    spmAB: string;
                    spmC: string;
                    spmD: string;
                    scmAB: string;
                    scmC: string;
                    scmD: string;
                    index: number;
                    reportDataOpt: boolean;
                    trackInfo: {
                      component_id: string;
                      pvv_vid: string;
                      component_instance_id: number;
                      utdid: string;
                      servertime: number;
                      pageid: string;
                      lifecycle: number;
                      drawerid: string;
                      pvv_sid: string;
                      cms_req_id: string;
                    };
                    utParam: null;
                  };
                };
                allowRefresh: number;
                title: string;
              };
              nodes: {
                id: number;
                level: number;
                type: number;
                typeName: string;
                more: boolean;
                traceId: string;
                style: null;
                render: null;
                data: {
                  heat: number;
                  updateInfo: string;
                  showImgV: string;
                  introTitle: string;
                  mark: {
                    type: string;
                    data: {
                      text: string;
                      color: string;
                      iconfont: null;
                      colorValue: null;
                      img: null;
                      img2: null;
                      ratio: null;
                      imgList: null;
                    };
                  };
                  introSubTitle: string;
                  desc: string;
                };
                nodes: null;
                layout: null;
                header: null;
                contentId: null;
                raxConfig: null;
                config: null;
              }[];
              layout: null;
              header: null;
              contentId: null;
              raxConfig: null;
              config: null;
            }[];
            layout: null;
            header: null;
            contentId: null;
            raxConfig: null;
            config: null;
          }[];
          layout: null;
          header: null;
          contentId: null;
          raxConfig: null;
          config: null;
        };
      };
    };
  };
  shieldSwitch: boolean;
  rid: number;
  videoId: string;
  showId: string;
  playlistId: null;
  ip: string;
  proxyIp: string;
  isIku: boolean;
  isI18n: boolean;
};

export type YoukuSeasonProfileResp = {
  api: string;
  data: {
    2019030100: {
      data: {
        data: {
          stageTabs: {
            itemEndStage: string;
            title: string;
            itemStartStage: string;
          }[];
          session: string;
          pageSize: number;
          positionStyle: number;
          title: string;
          pageIndex: number;
          series: {
            current: boolean;
            showId: string;
            showLongId: number;
            session: string;
            action: {
              report: {
                spmD: string;
                reportDataOpt: boolean;
                scmD: string;
                trackInfo: {
                  lifecycle: number;
                  component_id: string;
                  pvv_vid: string;
                  component_instance_id: number;
                  utdid: string;
                  servertime: number;
                  pageid: string;
                  pvv_sid: string;
                  cms_req_id: string;
                };
                scmC: string;
                arg1: string;
                spmC: string;
                spmAB: string;
                index: number;
                pageName: string;
                scmAB: string;
              };
              type: string;
              reportDisabled: boolean;
            };
            title: string;
            lastEpisodeVideoId: string;
          }[];
          allowPlay: number;
          allowUnionRefresh: number;
          action: {
            report: {
              spmD: string;
              reportDataOpt: boolean;
              scmD: string;
              trackInfo: {
                lifecycle: number;
                component_id: string;
                pvv_vid: string;
                component_instance_id: number;
                utdid: string;
                servertime: number;
                pageid: string;
                pvv_sid: string;
                cms_req_id: string;
              };
              scmC: string;
              arg1: string;
              spmC: string;
              spmAB: string;
              index: number;
              pageName: string;
              scmAB: string;
            };
            type: string;
            reportDisabled: boolean;
          };
          allowRefresh: number;
          allowDownload: boolean;
          lastStage: number;
        };
        id: number;
        level: number;
        more: boolean;
        nodes: {
          data: {
            summary: string;
            versionType: number[];
            img: string;
            titleLine: number;
            stage: number;
            videoType: string;
            summaryType: string;
            subtitle: string;
            paid: number;
            action: {
              extra: {
                showId: string;
                extraParams: {
                  allowMulti: boolean;
                };
              };
              report: {
                spmD: string;
                reportDataOpt: boolean;
                scmD: string;
                trackInfo: {
                  component_id: string;
                  pvv_vid: string;
                  component_instance_id: number;
                  utdid: string;
                  servertime: number;
                  rsc_r: string;
                  rsc_s: string;
                  videoid: number;
                  pageid: string;
                  lifecycle: number;
                  material_id: string;
                  pvv_sid: string;
                  video_id: number;
                  cms_req_id: string;
                };
                scmC: string;
                arg1: string;
                spmC: string;
                spmAB: string;
                index: number;
                pageName: string;
                scmAB: string;
              };
              type: string;
              value: string;
              reportDisabled: boolean;
            };
            title: string;
          };
          id: number;
          level: number;
          more: boolean;
          type: number;
        }[];
        type: number;
        typeName: string;
      };
      headers: {
        stat_req_episode: string;
        manufacturingDate: string;
        stat_c_10013: string;
      };
      msCode: string;
      success: boolean;
    };
  };
  ret: string[];
  v: string;
};

export type YoukuEpisodeProfileResp = {
  api: string;
  data: {
    2019030100: {
      data: {
        data: {
          session: string;
          extra: {
            autoPay: boolean;
            videoCategory: string;
            audiolang: {
              vid: number;
              langcode: string;
              lang: string;
            }[];
            videoId: string;
            showReleaseTime: string;
            videoLibraryTag: number[];
            episodeFinalStage: number;
            showCategory: string;
            videoType: string;
            allowLike: boolean;
            isNewReservation: boolean;
            completed: boolean;
            allowComment: boolean;
            streamTypes: string[];
            totalUp: number;
            videoCategoryId: number;
            showVideoStageDesc: string;
            showImg: string;
            isFavorite: boolean;
            totalComment: number;
            videoCacheConfig: {
              resourceId: string;
              buttonDesc: string;
              icon: {};
              downloadStatus: string;
              toastText: string;
            };
            episodeTotal: number;
            pageKey: string;
            showVideoStage: number;
            allowShare: boolean;
            duration: number;
            showSubtitle: string;
            showId: string;
            showImgV: string;
            isPugv: boolean;
            videoPublishTime: string;
            showCategoryId: number;
            allowDownload: boolean;
            videoImgV: string;
            showName: string;
            showLongId: number;
            videoImg: string;
            reportUrl: string;
            videoTitle: string;
            isTracking: boolean;
            episodeLast: number;
            showLibraryTag: number[];
            paid: number;
            adRestricted: number;
            downloadStatus: string[];
            videoLongId: number;
          };
          title: string;
        };
        id: number;
        level: number;
        more: boolean;
        nodes: {
          data: {
            session: string;
          };
          id: number;
          level: number;
          more: boolean;
          nodes: {
            data: {
              session: string;
              subtitle: string;
              allowPlay: number;
              action: {
                report: {
                  spmD: string;
                  reportDataOpt: boolean;
                  scmD: string;
                  trackInfo: {
                    lifecycle: number;
                    component_id: string;
                    drawerid: string;
                    pvv_vid: string;
                    component_instance_id: number;
                    utdid: string;
                    servertime: number;
                    pageid: string;
                    pvv_sid: string;
                    cms_req_id: string;
                  };
                  scmC: string;
                  arg1: string;
                  spmC: string;
                  spmAB: string;
                  index: number;
                  pageName: string;
                  scmAB: string;
                };
                type: string;
                reportDisabled: boolean;
              };
              allowRefresh: number;
              title: string;
            };
            id: number;
            level: number;
            more: boolean;
            nodes: {
              data: {
                heat: number;
                updateInfo: string;
                audioLang: {
                  langCode: string;
                  videoId: string;
                  lang: string;
                }[];
                showImgV: string;
                introTitle: string;
                mark: {
                  data: {
                    color: string;
                    text: string;
                  };
                  type: string;
                };
                introSubTitle: string;
                desc: string;
                personId: string;
                img: string;
                title: string;
                subtitle: string;
              };
              id: number;
              level: number;
              more: boolean;
              type: number;
              typeName: string;
            }[];
            type: number;
            typeName: string;
          }[];
          type: number;
          typeName: string;
        }[];
        type: number;
        typeName: string;
      };
      headers: {
        stat_req_episode: string;
        manufacturingDate: string;
        stat_c_10013: string;
      };
      msCode: string;
      success: boolean;
    };
  };
  ret: string[];
  v: string;
};

/**
 * 根据关键字搜索电视剧
 * 移动端
 */
export async function search_media_in_youku(keyword: string, options: RequestCommonPart & { page?: number } = {}) {
  const endpoint = "https://search.youku.com/search_video";
  const query = {
    keyword,
  };
  const result = await request.get<string>(endpoint, query);
  const { error, data } = result;
  if (error) {
    return Result.Err(error.message);
  }
  const $ = cheerio.load(data);
  const $list = $(".h5-show-card-wrapper");
  // const json_r = /window.__INITIAL_DATA__ {0,1}=([^;]{1,}); /;
  // const json: {} | null = (() => {
  //   try {
  //     const j = data.match(json_r);
  //     console.log(j);
  //     if (!j) {
  //       return null;
  //     }
  //     const r = JSON.parse(j[1]);
  //     return r;
  //   } catch (err) {
  //     return null;
  //   }
  // })();
  // if (json === null) {
  //   return Result.Err("解析失败1");
  // }
  // console.log(json.data.data.nodes);
  const list: SearchedTVItem[] = [];
  for (let i = 0; i < $list.length; i += 1) {
    (() => {
      const $card = $list[i];
      const line = $($card).html();
      if (!line) {
        return;
      }
      const href_r = /href="([^"]{1,})" data-spm="dplaybutton"/;
      const title_r = /<div class="show-name">([^<]{1,})<\/div>/;
      const poster_path_r = /background-image:url\(([^)]{1,})\)/;
      const info_r = /<div class="show-feature">([^<]{1,})<\/div>/;
      const r = line.match(info_r)?.[1];
      if (!r) {
        return;
      }
      const [air_date, tag, origin_country] = r.split("·").map((s) => s.trim());
      if (!tag) {
        return;
      }
      const source = $($card).find(".show-sourcename").text();
      const payload = {
        id: line.match(href_r)?.[1] as string,
        name: line.match(title_r)?.[1] as string,
        original_name: null,
        overview: null,
        poster_path: (line.match(poster_path_r)?.[1] ?? null) as string | null,
        backdrop_path: null,
        first_air_date: (air_date ?? null) as string | null,
        origin_country: [origin_country]
          .map((c) => {
            return MEDIA_COUNTRY_MAP[c];
          })
          .filter(Boolean),
        type: MEDIA_TYPE_MAP[tag],
        source: MEDIA_SOURCE_MAP[source || "youku"],
      } as SearchedTVItem;
      list.push(payload);
    })();
  }
  return Result.Ok({
    list,
  });
}
export type TVProfileItemInYouku = UnpackedResult<Unpacked<ReturnType<typeof search_media_in_youku>>>["list"][number];

/**
 * 根据关键字搜索电视剧
 * @param keyword
 */
export async function search_movie_in_tmdb(keyword: string, options: RequestCommonPart & { page?: number }) {
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
export type MovieProfileItemInTMDB = UnpackedResult<Unpacked<ReturnType<typeof search_movie_in_tmdb>>>["list"][number];

/**
 * 获取电视剧详情
 * @link https://developers.themoviedb.org/3/tv/get-tv-details
 * @param id 电视剧 tmdb id
 */
export async function fetch_tv_profile_in_youku(id: string | number, query: RequestCommonPart) {
  if (id === undefined) {
    return Result.Err("请传入电视剧 id");
  }
  const endpoint = `https://m.youku.com/alipay_video/id_${id}.html`;
  const { api_key } = query;
  const r = await request.get<string>(endpoint, {
    api_key,
  });
  if (r.error) {
    return Result.Err(r.error);
  }
  const data = r.data;
  const name_r = /<h1>(.+?)<\/h1>/;
  const json_r = /window.__INITIAL_DATA__ =([^;]{1,});/;
  const name = data.match(name_r);
  if (!name) {
    return Result.Err("解析失败0");
  }
  const name_and_season = (() => {
    const n = name[1];
    return parse_filename_for_video(n, ["name", "season"]);
  })();
  const json: {
    videoMap: {
      episodeTotal: number;
      completed: boolean;
    };
    componentList: {
      type: number;
      dataNode: {
        type: number;
        data: {
          desc: string;
          img: string;
          showReleaseYear: number;
          showGenre: string;
          area: string[];
          stage: number;
          title: string;
        };
      }[];
    }[];
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
  const profile = json.componentList.find((c) => c.type === 10009);
  if (!profile) {
    return Result.Err("解析失败2");
  }
  const info = profile.dataNode.find((d) => d.type === 10010);
  if (!info) {
    return Result.Err("解析失败3");
  }
  const {
    data: { desc },
  } = info;
  // const actors = profile.dataNode.filter((d) => d.type === 10011);
  const episode = json.componentList.find((c) => c.type === 10013);
  return Result.Ok({
    id,
    /** 中文片名 */
    name: name_and_season.name,
    /** 中文简介 */
    overview: desc,
    poster_path: info.data.img,
    backdrop_path: null,
    /** 产地片名 */
    original_name: null,
    seasons: [
      {
        air_date: (() => {
          if (!episode) {
            return null;
          }
          return String(episode.dataNode[0].data.stage).replace(/([0-9]{4})([0-9]{2})([0-9]{2})/, "$1-$2-$3");
        })(),
        episode_count: json.videoMap.episodeTotal,
        name: name_and_season.season ?? null,
        overview: desc,
        poster_path: info.data.img,
        season_number: (() => {
          if (!name_and_season.season) {
            return null;
          }
          const r1 = name_and_season.season.match(/[0-9]{1,}/);
          if (!r1) {
            return null;
          }
          return Number(r1[0]);
        })(),
        vote_average: 0,
        // episodes: episode
        //   ? episode.dataNode.map((e, i) => {
        //       const { img, title, stage } = e.data;
        //       return {
        //         name: title,
        //         air_date: String(stage).replace(/([0-9]{4})([0-9]{2})([0-9]{2})/, "$1-$2-$3"),
        //         episode_number: i + 1,
        //         thumbnail: img,
        //       };
        //     })
        //   : [],
      },
    ],
    in_production: json.videoMap.completed,
    first_air_date: (() => {
      return null;
    })(),
    vote_average: 0,
    popularity: 0,
    number_of_episodes: json.videoMap.episodeTotal,
    number_of_seasons: 1,
    status: null,
    genres: info.data.showGenre
      .split(" ")
      .map((t) => t.trim())
      .map((t) => {
        return {
          id: t,
          name: t,
        };
      }),
    origin_country: info.data.area
      .map((area) => {
        return MEDIA_COUNTRY_MAP[area];
      })
      .filter(Boolean),
  });
}
export type TVProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_tv_profile_in_youku>>>;
export type PartialSeasonFromTMDB = TVProfileFromTMDB["seasons"][number];

/**
 * 获取电视剧某一季详情
 * @link https://developers.themoviedb.org/3/tv/get-tv-details
 * @param number 第几季
 */
export async function fetch_season_profile(
  body: {
    tv_id: number | string;
    season_number: number | undefined;
  },
  options: RequestCommonPart
) {
  const { tv_id, season_number } = body;
  if (season_number === undefined) {
    return Result.Err("请传入季数");
  }
  const endpoint = `/tv/${tv_id}/season/${season_number}`;
  const { api_key } = options;
  const result = await request.get<{
    _id: string;
    air_date: string;
    episodes: {
      air_date: string;
      episode_number: number;
      crew: {
        department: string;
        job: string;
        credit_id: string;
        adult: boolean;
        gender: number;
        id: number;
        known_for_department: string;
        name: string;
        original_name: string;
        popularity: number;
        profile_path: string;
      }[];
      guest_stars: {
        credit_id: string;
        order: number;
        character: string;
        adult: boolean;
        gender: number;
        id: number;
        known_for_department: string;
        name: string;
        original_name: string;
        popularity: number;
        profile_path: string;
      }[];
      id: number;
      name: string;
      overview: string;
      runtime: number;
      production_code: string;
      season_number: number;
      still_path: string;
      vote_average: number;
      vote_count: number;
    }[];
    name: string;
    overview: string;
    id: number;
    poster_path: string;
    season_number: number;
  }>(endpoint, {
    api_key,
  });
  if (result.error) {
    // console.log("find season in tmdb failed", result.error.message);
    if (result.error.message.includes("404")) {
      return Result.Ok(null);
    }
    return Result.Err(result.error);
  }
  const { id, name, overview, air_date, episodes, poster_path } = result.data;
  return Result.Ok({
    id,
    name,
    number: result.data.season_number,
    air_date,
    overview,
    season_number,
    episodes: episodes.map((e) => {
      const { id, air_date, overview, episode_number, season_number, name, runtime } = e;
      return {
        id,
        name,
        overview,
        air_date,
        episode_number,
        season_number,
        runtime,
      };
    }),
    poster_path,
  });
}
export type SeasonProfileFromTMDB = UnpackedResult<Unpacked<ReturnType<typeof fetch_season_profile>>>;

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
