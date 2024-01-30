/**
 * @file 获取指定日期内新增的剧集、电影
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { MediaTypes } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { start_time, end_time, page_size, next_marker } = req.body as Partial<{
    start_time: number;
    end_time: number;
    page_size: number;
    next_marker: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const range = (() => {
    if (start_time && end_time) {
      return [dayjs(start_time).toISOString(), dayjs(end_time).toISOString()];
    }
    return [dayjs().startOf("day").toISOString(), dayjs().endOf("day").toISOString()];
  })();
  const episodes = await store.prisma.media_source.findMany({
    where: {
      created: {
        gte: range[0],
        lt: range[1],
      },
      user_id: user.id,
    },
    include: {
      media: {
        include: {
          profile: true,
        },
      },
    },
    distinct: ["media_id"],
    take: 20,
    orderBy: [
      {
        created: "desc",
      },
    ],
  });
  type MediaPayload = {
    id: string;
    type: MediaTypes;
    name: string;
    poster_path: string;
    air_date: string;
    text: string | null;
    created: number;
  };
  const medias: MediaPayload[] = [];
  for (let i = 0; i < episodes.length; i += 1) {
    await (async () => {
      const episode = episodes[i];
      const { media } = episode;
      const episode_recently = await store.prisma.media_source.findMany({
        where: {
          media_id: media.id,
          files: {
            some: {},
          },
          created: {
            gte: range[0],
            lt: range[1],
          },
        },
        include: {
          profile: true,
        },
        orderBy: {
          profile: {
            order: "desc",
          },
        },
      });
      const payload = {
        id: media.id,
        type: media.type,
        name: media.profile.name,
        poster_path: media.profile.poster_path,
        air_date: dayjs(media.profile.air_date).format("YYYY/MM/DD"),
        text: await (async () => {
          if (media.type === MediaTypes.Movie) {
            return media.profile.air_date;
          }
          const episode_count = await store.prisma.media_source.count({
            where: {
              media_id: media.id,
              files: {
                some: {},
              },
            },
          });
          if (media.profile.source_count === episode_count) {
            return `全 ${media.profile.source_count} 集`;
          }
          if (episode_count === episode_recently[0]?.profile.order) {
            return `更新 ${episode_recently.map((e) => e.profile.order).join("、")}`;
          }
          return `收录 ${episode_recently.map((e) => e.profile.order).join("、")}`;
        })(),
        created: episode_recently[0] ? dayjs(episode_recently[0].created).unix() : 0,
      } as MediaPayload;
      medias.push(payload);
    })();
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      list: medias,
    },
  });
}
