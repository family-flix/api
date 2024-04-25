/**
 * @file 获取有问题的季列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { normalize_partial_tv } from "@/domains/media_thumbnail/utils";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { season_to_chinese_num } from "@/utils";
import { to_number } from "@/utils/primitive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  // const {
  //   drive_id,
  //   season_number,
  //   page: page_str,
  //   page_size: page_size_str,
  // } = req.query as Partial<{
  //   name: string;
  //   genres: string;
  //   language: string;
  //   drive_id: string;
  //   season_number: string;
  //   invalid: string;
  //   duplicated: string;
  //   page: string;
  //   page_size: string;
  // }>;
  // const { authorization } = req.headers;
  // const t_res = await User.New(authorization, store);
  // if (t_res.error) {
  //   return e(t_res);
  // }
  // const user = t_res.data;
  // const { id: user_id } = user;
  // const page = to_number(page_str, 1);
  // const page_size = to_number(page_size_str, 20);
  // const where: ModelQuery<"season"> = {
  //   OR: [
  //     {
  //       episodes: {
  //         none: {},
  //       },
  //     },
  //     {
  //       episodes: {
  //         every: {
  //           parsed_episodes: {
  //             none: {},
  //           },
  //         },
  //       },
  //     },
  //   ],
  //   user_id,
  // };
  // const count = await store.prisma.incomplete_tv.count({
  //   where,
  // });
  // const list = await store.prisma.incomplete_tv.findMany({
  //   where,
  //   include: {
  //     season: {
  //       include: {
  //         profile: true,
  //         tv: {
  //           include: {
  //             profile: true,
  //           },
  //         },
  //       },
  //     },
  //   },
  //   skip: (page - 1) * page_size,
  //   take: page_size,
  // });
  // const data = {
  //   total: count,
  //   list: list.map((invalid) => {
  //     if (!invalid.season) {
  //       return {
  //         id: invalid.id,
  //       };
  //     }
  //     const { season, text, cur_count } = invalid;
  //     const { id, season_text, profile } = season;
  //     const { name, poster_path, air_date, episode_count } = profile;
  //     return {
  //       id,
  //       tv_id: season.tv.id,
  //       name,
  //       season_text,
  //       poster_path: poster_path || season.tv.profile.poster_path,
  //       air_date,
  //       text,
  //       cur_count,
  //       episode_count,
  //     };
  //   }),
  //   page,
  //   page_size,
  //   no_more: list.length + (page - 1) * page_size >= count,
  // };
  res.status(200).json({
    code: 0,
    msg: "",
    data: null,
  });
}
