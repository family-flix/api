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
    page = 1,
    page_size = 20,
  } = req.body as Partial<{
    name: string;
    page: number;
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
  const offset = (page - 1) * page_size;
  const result: {
    id: string;
    name: string;
    poster_path: string;
    type: number;
    media_sources: string;
  }[] = await store.prisma.$queryRaw`
    SELECT 
      m.id, mp.name, mp.poster_path, mp.type,
      (
        SELECT json_group_array(
            json_object(
                'id', ms.id,
                'order', msp.\'order\',
                'name', msp.name,
                'subtitles', (
                    SELECT json_group_array(json_object(
                        'id', s.id,
                        'language', s.language,
                        'type', s.type,
                        'unique_id', s.unique_id
                    ))
                    FROM subtitle_v2 s
                    WHERE s.media_source_id = ms.id
                )
            )
        )
        FROM MediaSource ms
        JOIN MediaSourceProfile msp ON ms.profile_id = msp.id
        WHERE ms.media_id = m.id
    ) AS media_sources
    FROM media m
    JOIN MediaSource ms ON m.id = ms.media_id
    LEFT JOIN MediaProfile mp ON m.profile_id = mp.id
    WHERE EXISTS (
        SELECT 1 
        FROM subtitle_v2 s 
        WHERE s.media_source_id = ms.id
    )
    GROUP BY m.id
    ORDER BY (
        SELECT MAX(s.created) 
        FROM subtitle_v2 s 
        JOIN MediaSource ms2 ON s.media_source_id = ms2.id
        WHERE ms2.media_id = m.id
    ) DESC
    LIMIT ${page_size} OFFSET ${offset};
  `;
  const data = {
    total: count,
    page_size,
    page: page + 1,
    no_more: result.length + (page - 1) * page_size >= count,
    list: result.map((media) => {
      const { id, type, name, poster_path, media_sources } = media;
      const sources: {
        id: string;
        name: string;
        order: number;
        subtitles: {
          id: string;
          language: string;
          type: number;
          unique_id: string;
        }[];
      }[] = JSON.parse(media_sources);
      return {
        id,
        type,
        name,
        poster_path,
        sources: sources
          .sort((a, b) => a.order - b.order)
          .map((source) => {
            return {
              ...source,
              subtitles: source.subtitles.reverse(),
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
