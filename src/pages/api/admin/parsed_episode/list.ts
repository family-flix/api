/**
 * @file 管理后台/搜索解析出的剧集
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { to_number } from "@/utils/primitive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    file_name,
    name,
    season_text,
    episode_text,
    can_search,
    page: page_str,
    page_size: page_size_str,
  } = req.body as Partial<{
    file_name: string;
    name: string;
    season_text: string;
    episode_text: string;
    can_search: string;
    page: string;
    page_size: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
  const queries: NonNullable<ModelQuery<"parsed_episode">>[] = [];
  const where: ModelQuery<"parsed_episode"> = {
    can_search: can_search ? to_number(can_search, 1) : undefined,
    user_id: user.id,
  };
  if (file_name) {
    queries.push({
      file_name: {
        contains: file_name,
      },
    });
  }
  if (name) {
    queries.push({
      parsed_tv: {
        name: {
          contains: name,
        },
      },
    });
  }
  if (season_text) {
    queries.push({
      season_number: {
        contains: season_text,
      },
    });
  }
  if (episode_text) {
    queries.push({
      episode_number: {
        contains: episode_text,
      },
    });
  }
  if (queries.length !== 0) {
    where.AND = queries;
  }
  const list = await store.prisma.parsed_episode.findMany({
    where,
    include: {
      parsed_tv: {
        include: {
          tv: {
            include: {
              profile: true,
            },
          },
        },
      },
      season: {
        include: {
          profile: true,
        },
      },
      episode: {
        include: {
          profile: true,
        },
      },
    },
    orderBy: {
      created: "desc",
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const count = await store.prisma.parsed_episode.count({
    where,
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      total: count,
      page,
      page_size,
      no_more: list.length + (page - 1) * page_size >= count,
      list: list.map((parsed_episode) => {
        const { id, season_number, episode_number, parsed_tv, season } = parsed_episode;
        return {
          id,
          season_text: season_number,
          episode_text: episode_number,
          profile: parsed_tv.tv
            ? {
                name: parsed_tv.tv.profile.name,
                poster_path: parsed_tv.tv.profile.poster_path,
              }
            : null,
        };
      }),
    },
  });
}
