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
    parsed_media_id,
    next_marker = "",
  } = req.body as Partial<{
    empty: number;
    type: number;
    name: string;
    parsed_media_id: string;
    next_marker: string;
    page_size: number;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const where: ModelQuery<"parsed_media_source"> = {
    user_id: user.id,
  };
  if (empty === 1) {
    where.media_source_id = null;
  }
  if (type !== undefined) {
    where.type = type;
  }
  if (parsed_media_id) {
    where.parsed_media_id = parsed_media_id;
  }
  if (name) {
    where.OR = [
      {
        name: {
          contains: name,
        },
      },
      {
        file_name: {
          contains: name,
        },
      },
      {
        parent_paths: {
          contains: name,
        },
      },
    ];
  }
  const count = await store.prisma.parsed_media_source.count({ where });
  const result = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.parsed_media_source.findMany({
        where,
        include: {
          parsed_media: {
            include: {
              media_profile: true,
            },
          },
          drive: true,
        },
        orderBy: [
          {
            episode_text: "asc",
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
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page_size,
      total: count,
      next_marker: result.next_marker,
      list: result.list.map((parsed_media_source) => {
        const {
          id,
          name,
          type,
          original_name,
          season_text,
          episode_text,
          file_name,
          parent_paths,
          parsed_media,
          drive,
        } = parsed_media_source;
        return {
          id,
          type,
          name: name || original_name,
          season_text,
          episode_text,
          file_name,
          parent_paths,
          profile: (() => {
            if (!parsed_media?.media_profile) {
              return null;
            }
            const { id, name, poster_path, air_date } = parsed_media.media_profile;
            return {
              id,
              name,
              poster_path,
              air_date,
            };
          })(),
          drive: {
            id: drive.id,
            name: drive.name,
          },
        };
      }),
    },
  });
}
