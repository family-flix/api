/**
 * @file 获取 字幕 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { ModelQuery, TVProfileWhereInput } from "@/domains/store/types";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_subtitle_list(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    next_marker = "",
    page_size,
  } = req.body as Partial<{
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
  let queries: NonNullable<ModelQuery<"media">>[] = [];
  if (name) {
    queries = queries.concat({
      profile: {
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
    });
  }
  const where: ModelQuery<"media"> = {
    user_id: user.id,
  };
  where.media_sources = {
    some: {
      subtitles: {
        some: {},
      },
    },
  };
  if (queries.length !== 0) {
    where.AND = queries;
  }
  const count = await store.prisma.media.count({
    where,
  });
  const result = await store.list_with_cursor({
    fetch(extra) {
      return store.prisma.media.findMany({
        where,
        include: {
          profile: true,
          media_sources: {
            include: {
              subtitles: true,
              profile: true,
            },
            orderBy: {
              profile: {
                order: "asc",
              },
            },
          },
        },
        orderBy: {
          created: "desc",
        },
        ...extra,
      });
    },
    next_marker,
    page_size,
  });
  const data = {
    total: count,
    page_size,
    next_marker: result.next_marker,
    list: result.list.map((media) => {
      const { id, type, profile, media_sources } = media;
      return {
        id,
        type,
        name: profile.name,
        poster_path: profile.poster_path,
        sources: media_sources.map((episode) => {
          const { id, profile, subtitles } = episode;
          return {
            id,
            name: profile.name,
            order: profile.order,
            subtitles: subtitles.map((subtitle) => {
              const { id, type, language, unique_id } = subtitle;
              return {
                id,
                type,
                unique_id,
                language,
              };
            }),
          };
        }),
      };
    }),
  };
  return res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
