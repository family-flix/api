/**
 * @file 获取影视剧推荐集合列表
 */
import dayjs from "dayjs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { ModelQuery } from "@/domains/store/types";
import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types";
import { CollectionTypes, MediaTypes } from "@/constants";
import { store } from "@/store";
import { response_error_factory } from "@/utils/server";
import { parseJSONStr } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    type = CollectionTypes.Manually,
    next_marker = "",
    page_size,
  } = req.body as Partial<{
    type: CollectionTypes;
    page_size: number;
    next_marker: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  let queries: NonNullable<ModelQuery<"collection_v2">>[] = [];
  const where: ModelQuery<"collection_v2"> = {
    type,
    user_id: member.user.id,
  };
  if (queries.length !== 0) {
    where.AND = queries;
  }
  const count = await store.prisma.collection_v2.count({
    where,
  });
  const result = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.collection_v2.findMany({
        where,
        include: {
          medias: {
            include: {
              _count: true,
              media_sources: {
                include: {
                  profile: true,
                },
                take: 1,
                orderBy: {
                  profile: {
                    order: "desc",
                  },
                },
              },
              profile: true,
            },
          },
        },
        orderBy: [
          {
            sort: "desc",
          },
          {
            created: "desc",
          },
        ],
        ...args,
      });
    },
    page_size,
    next_marker,
  });
  const data = {
    total: count,
    page_size,
    next_marker: result.next_marker,
    list: result.list.map((collection) => {
      const { id, type, title, desc, extra, medias } = collection;
      const r = parseJSONStr<{ orders: Record<string, number> }>(extra);
      return {
        id,
        type,
        title,
        desc,
        medias: medias.map((media) => {
          const { id, type, profile, created } = media;
          return {
            id,
            type,
            name: profile.name,
            poster_path: profile.poster_path,
            air_date: profile.air_date,
            order: (() => {
              if (r.error) {
                return 9000;
              }
              const orders = r.data.orders;
              if (orders[id] !== undefined) {
                return orders[id];
              }
              return 9000;
            })(),
            text: (() => {
              if (type === MediaTypes.Movie) {
                return null;
              }
              const latest_episode = media.media_sources[0];
              if (!latest_episode) {
                return "信息异常";
              }
              const episode_count = profile.source_count;
              if (media._count.media_sources === episode_count) {
                return `全${episode_count}集`;
              }
              if (latest_episode.profile.order === media._count.media_sources) {
                return `更新至${media._count.media_sources}集`;
              }
              return `收录${media._count.media_sources}集`;
            })(),
            created: dayjs(created).unix(),
          };
        }),
      };
    }),
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
