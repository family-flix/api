/**
 * @file 获取未识别，认为是电视剧的记录列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    empty = 1,
    type,
    page_size,
    next_marker,
  } = req.body as Partial<{
    empty: number;
    type: number;
    name: string;
    next_marker: string;
    page_size: number;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const where: ModelQuery<"parsed_media"> = {
    user_id: user.id,
  };
  if (empty === 1) {
    where.media_profile_id = null;
  }
  if (type !== undefined) {
    where.type = type;
  }
  if (name) {
    where.OR = [
      {
        name: {
          contains: name,
        },
      },
      {
        media_profile: {
          OR: [
            {
              name: {
                contains: name,
              },
            },
            {
              original_name: {
                contains: name,
              },
            },
          ],
        },
      },
    ];
  }
  const count = await store.prisma.parsed_media.count({ where });
  const result = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.parsed_media.findMany({
        where,
        include: {
          _count: true,
          media_profile: true,
          parsed_sources: {
            include: {
              media_source: {
                include: {
                  profile: true,
                },
              },
              drive: true,
            },
            take: 10,
            orderBy: {
              episode_text: "asc",
            },
          },
        },
        orderBy: {
          created: "desc",
        },
        ...args,
      });
    },
    page_size,
    next_marker,
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page_size,
      total: count,
      next_marker: result.next_marker,
      list: result.list.map((parsed_tv) => {
        const { id, name, type, original_name, season_text, parsed_sources, media_profile, _count } = parsed_tv;
        return {
          id,
          type,
          name: name || original_name,
          season_text,
          profile: (() => {
            if (!media_profile) {
              return null;
            }
            return {
              id: media_profile.id,
              name: media_profile.name,
              poster_path: media_profile.poster_path,
              air_date: media_profile.air_date,
            };
          })(),
          sources: parsed_sources.map((episode) => {
            const { id, name, original_name, season_text, episode_text, file_name, parent_paths, media_source, drive } =
              episode;
            return {
              id,
              name,
              original_name,
              season_text,
              episode_text,
              file_name,
              parent_paths,
              profile: (() => {
                if (!media_source) {
                  return null;
                }
                const { id, name, order } = media_source.profile;
                return {
                  id,
                  name,
                  order,
                };
              })(),
              drive: {
                id: drive.id,
                name: drive.name,
              },
            };
          }),
          has_more_sources: parsed_sources.length < _count.parsed_sources,
        };
      }),
    },
  });
}
