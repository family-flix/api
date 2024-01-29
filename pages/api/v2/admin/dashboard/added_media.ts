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
  const result = await store.list_with_cursor({
    fetch: async (extra) => {
      return await store.prisma.media_source.findMany({
        where: {
          created: {
            gte: range[0],
            lt: range[1],
          },
          user_id: user.id,
        },
        include: {
          profile: true,
          media: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: [
          {
            created: "desc",
          },
        ],
        ...extra,
      });
    },
    page_size,
    next_marker,
  });
  const data = {
    next_marker: result.next_marker,
    list: result.list.map((source) => {
      const {
        id,
        profile,
        media: { id: media_id, type, profile: media_profile },
        created,
      } = source;
      return {
        id,
        media_id,
        type: media_profile.type,
        name: media_profile.name,
        poster_path: media_profile.poster_path,
        air_date: media_profile.air_date,
        order: media_profile.order,
        text: (() => {
          if (type === MediaTypes.Movie) {
            return null;
          }
          return `${profile.order}、${profile.name}`;
        })(),
        created_at: created,
      };
    }),
  };
  res.status(200).json({ code: 0, msg: "", data });
}
