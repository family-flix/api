/**
 * @file 电视剧与分享资源的同步关系列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
    name: string;
    page: string;
    page_size: string;
  }>;
  const t_resp = await User.New(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const list = await store.prisma.bind_for_parsed_tv.findMany({
    where: {
      parsed_tv: {
        tv_id: {
          not: null,
        },
      },
      user_id,
    },
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
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const count = await store.prisma.bind_for_parsed_tv.count({
    where: {
      parsed_tv: {
        tv_id: {
          not: null,
        },
      },
      user_id,
    },
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      total: count,
      page,
      page_size,
      no_more: list.length + (page - 1) * page_size <= count,
      list: list.map((task) => {
        const { id, file_id, name, url, parsed_tv } = task;
        return {
          id,
          file_id,
          file_name: name,
          url,
          tv: {
            name: parsed_tv.tv?.profile.name,
            overview: parsed_tv.tv?.profile.overview,
            poster_path: parsed_tv.tv?.profile.poster_path,
          },
        };
      }),
    },
  });
}
