import { HttpClientCore } from "@/domains/http_client";
import { connect } from "@/domains/http_client/provider.axios";
import { Application } from "@/domains/application";
import { FileManage } from "@/domains/uploader";
import { MediaProfileClient } from "@/domains/media_profile/index";
import { User } from "@/domains/user/index";
import { DataStore } from "@/domains/store/types";
import { ThirdDoubanClient } from "@/domains/media_profile/third_douban";
import { Result } from "@/domains/result/index";
import { MediaTypes } from "@/constants/index";

// export class MediaRankClient {
// $client = new HttpClientCore({});

// 	constructor() {

// 	}

// 	fetch_douban_season_rank() {
// 	}
// }

export function MediaRankClient(props: { app: Application<any>; user: User; store: DataStore }) {
  const { app, user, store } = props;

  const client = new HttpClientCore({});
  connect(client);

  // const { hostname, token } = user.settings.third_douban!;

  // const $douban_rank = new RequestCore(fetch_douban_rank, {
  //   client,
  // });
  async function link_media_with_rank_media(
    rank_media: {
      name: string;
      order: number;
      rate: number | null;
      douban_id: string | null;
    },
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
      const { tmdb_token, third_douban } = user.settings;
      if (!third_douban) {
        return Result.Err("必须使用三方豆瓣接口");
      }
      if (!tmdb_token) {
        return Result.Err("缺少 tmdb_token");
      }
      const client = ThirdDoubanClient({ hostname: third_douban.hostname, token: third_douban.token });
      const r = await client.fetch_media_rank(values);
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
      // const $profile = new MediaProfileClient({
      //   tmdb: { token: tmdb_token },
      //   third_douban,
      //   uploader: new FileManage({ root: app.assets }),
      //   store,
      // });
      for (let i = 0; i < list.length; i += 1) {
        const { douban_id } = list[i];
        await (async () => {
          if (!douban_id) {
            return;
          }
          const d1 = await store.prisma.media_profile.findFirst({
            where: {
              douban_id,
            },
          });
          if (d1) {
            return;
          }
          const r = await client.fetch_media_profile(douban_id, {});
          if (r.error) {
            console.log("client.fetch_media_profile failed", r.error.message);
            return;
          }
          if (!r.data.name) {
            return;
          }
          const d2 = await store.prisma.media_series_profile.findFirst({
            where: {
              name: r.data.name,
              original_name: r.data.original_name,
              air_date: r.data.air_date,
            },
          });
          if (d2) {
            return;
          }
          // if (r.data.type === "movie") {
          //   await $profile.search_movie({ keyword: r.data.name, year: r.data.air_date });
          // }
          // if (r.data.type === "tv") {
          //   await $profile.search_season({ keyword: r.data.name, season_text: null, year: r.data.air_date });
          // }
        })();
        const r = await link_media_with_rank_media(list[i], {
          type: values.type === "movie" ? MediaTypes.Movie : MediaTypes.Season,
        });
        medias.push(r);
      }
      return Result.Ok(medias);
    },
  };
}
