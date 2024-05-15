import { HttpClientCore } from "@/domains/http_client";
import { connect } from "@/domains/http_client/provider.axios";
import { RequestCoreV2 } from "@/domains/request";
import { request, TmpRequestResp } from "@/domains/request/utils";
import { DataStore } from "@/domains/store/types";
import { Result } from "@/types/index";
import { MediaTypes } from "@/constants/index";

// export class MediaRankClient {
// $client = new HttpClientCore({});

// 	constructor() {

// 	}

// 	fetch_douban_season_rank() {
// 	}
// }

export function MediaRankClient(props: { store: DataStore }) {
  const { store } = props;

  const $client = new HttpClientCore({});
  connect($client);
  // @ts-ignore
  const _client: HttpClientCore = {
    async get<T>(...args: Parameters<typeof $client.get>) {
      const r = await $client.get<{ code: number; msg: string; data: T }>(...args);
      if (r.error) {
        return Result.Err(r.error.message);
      }
      const { code, msg, data } = r.data;
      if (code !== 0) {
        return Result.Err(msg);
      }
      return Result.Ok(data as T);
    },
  };
  function fetch_douban_rank(values: { type: "movie" | "tv" }) {
    return request.get<{
      list: {
        name: string;
        /** 序号 */
        order: number;
        /** 豆瓣评分 */
        rate: number | null;
        extra_text: string | null;
        /** 豆瓣 id */
        douban_id: string | null;
      }[];
    }>("http://127.0.0.1:9001/api/v1/media_rank", {
      source: 1,
      type: values.type,
    });
  }
  const $douban_rank = new RequestCoreV2({
    fetch: fetch_douban_rank,
    client: _client,
  });
  async function link_media_with_rank_media(
    rank_media: NonNullable<TmpRequestResp<typeof fetch_douban_rank>["data"]>["list"][number],
    opt: { type: MediaTypes }
  ) {
    const { name, order, rate, douban_id } = rank_media;
    const { type } = opt;
    const r1 = await store.prisma.media.findFirst({
      where: {
        type,
        profile: {
          OR: [
            {
              name,
            },
            {
              douban_id,
            },
          ],
        },
      },
      include: {
        _count: true,
        profile: true,
        media_sources: {
          include: { profile: true },
        },
      },
    });
    return {
      id: r1 ? r1.id : null,
      name,
      order,
      poster_path: r1 ? r1.profile.poster_path : null,
      type: opt.type,
      vote_average: (() => {
        if (rate) {
          return rate;
        }
        if (r1 && r1.profile.vote_average) {
          return r1.profile.vote_average;
        }
        return null;
      })(),
      extra_text: (() => {
        if (type === MediaTypes.Movie) {
          if (!r1) {
            return null;
          }
          return `${r1.profile.air_date}上映`;
        }
        if (!r1) {
          return null;
        }
        const { source_count } = r1.profile;
        if (!source_count) {
          return null;
        }
        if (r1.media_sources.length === 0) {
          return null;
        }
        const latest = r1.media_sources[0];
        if (r1._count.media_sources === source_count) {
          return `全${source_count}集`;
        }
        if (latest.profile.order === source_count) {
          return `收录${r1._count.media_sources}集`;
        }
        return `更新至${r1._count.media_sources}集`;
      })(),
    };
  }
  return {
    async fetch_douban_rank(values: { type: "tv" | "movie" }) {
      const r = await $douban_rank.run(values);
      if (r.error) {
        return Result.Err(r.error.message);
      }
      // console.log("before const { list } = r.data", r.data);
      const { list } = r.data;
      const medias: {
        id: string | null;
        name: string;
        order: number;
        poster_path: string | null;
        vote_average: number | null;
      }[] = [];
      for (let i = 0; i < list.length; i += 1) {
        const r = await link_media_with_rank_media(list[i], {
          type: values.type === "movie" ? MediaTypes.Movie : MediaTypes.Season,
        });
        medias.push(r);
      }
      return Result.Ok(medias);
    },
  };
}
