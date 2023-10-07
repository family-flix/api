/**
 * @file 文件夹与分享资源的同步关系列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { ModelQuery } from "@/domains/store/types";
import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { to_number } from "@/utils/primitive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    in_production: in_production_str,
    invalid: invalid_str,
    page: page_str,
    page_size: page_size_str,
  } = req.query as Partial<{
    name: string;
    in_production: string;
    invalid: string;
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
  const in_production = to_number(in_production_str, 1);
  const queries: NonNullable<ModelQuery<"bind_for_parsed_tv">>[] = [
    {
      in_production,
    },
  ];
  if (invalid_str !== undefined) {
    const invalid = to_number(invalid_str, 0);
    queries.push({
      invalid,
    });
  }
  if (name) {
    queries.push({
      OR: [
        {
          name: {
            contains: name,
          },
        },
        {
          file_name_link_resource: {
            contains: name,
          },
        },
      ],
    });
  }
  const where: ModelQuery<"bind_for_parsed_tv"> = {
    user_id: user.id,
  };
  if (queries.length !== 0) {
    where.AND = queries;
  }
  const count = await store.prisma.bind_for_parsed_tv.count({
    where,
  });
  const list = await store.prisma.bind_for_parsed_tv.findMany({
    where,
    include: {
      season: {
        include: {
          _count: true,
          profile: true,
          tv: {
            include: {
              profile: true,
            },
          },
        },
      },
      drive: true,
    },
    skip: (page - 1) * page_size,
    take: page_size,
    orderBy: {
      created: "desc",
    },
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      total: count,
      page,
      page_size,
      no_more: list.length + (page - 1) * page_size >= count,
      list: list.map((task) => {
        const { id, file_id, name, invalid, file_id_link_resource, file_name_link_resource, url, season, drive } = task;
        return {
          id,
          resource_file_id: file_id,
          resource_file_name: name,
          drive_file_id: file_id_link_resource,
          drive_file_name: file_name_link_resource,
          url,
          invalid,
          season: (() => {
            if (!season) {
              return null;
            }
            const { name, overview, poster_path } = season.tv.profile;
            return {
              id: season.id,
              tv_id: season.tv.id,
              name,
              overview,
              air_date: season.profile.air_date,
              poster_path: season.profile.poster_path || poster_path,
              cur_episode_count: season._count.episodes,
              episode_count: season.profile.episode_count,
            };
          })(),
          drive: {
            id: drive.id,
            name: drive.name,
            avatar: drive.avatar,
          },
        };
      }),
    },
  });
}
