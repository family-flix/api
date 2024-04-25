/**
 * @file 获取演职人员列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { response_error_factory } from "@/utils/server";

export default async function v0_admin_person_list(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    tv_id,
    season_number,
    season_id,
    next_marker = "",
    page_size = 20,
  } = req.body as Partial<{
    tv_id: string;
    season_number: string;
    season_id: string;
    next_marker: string;
    page_size: number;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  // if (season_id) {
  //   const where: ModelQuery<"season"> = {
  //     id: season_id,
  //     user_id: user.id,
  //   };
  //   const args = store.build_extra_args({ next_marker, page_size });
  //   const season = await store.prisma.season.findFirst({
  //     where,
  //     include: {
  //       profile: {
  //         include: {
  //           persons: {
  //             include: {
  //               profile: true,
  //             },
  //             orderBy: {
  //               order: "asc",
  //             },
  //             ...args,
  //           },
  //         },
  //       },
  //     },
  //   });
  //   if (!season) {
  //     return e(Result.Err("没有匹配的记录"));
  //   }
  //   const correct_list = season.profile.persons.slice(0, page_size);
  //   res.status(200).json({
  //     code: 0,
  //     msg: "",
  //     data: {
  //       next_marker: store.get_next_marker(season.profile.persons, { page_size }),
  //       list: correct_list.map((person) => {
  //         const { id, name, order, known_for_department, profile } = person;
  //         return {
  //           id,
  //           name,
  //           avatar: profile.profile_path,
  //           known_for_department,
  //           order,
  //         };
  //       }),
  //     },
  //   });
  //   return;
  // }
  // if (tv_id && season_number) {
  //   const where: ModelQuery<"season"> = {
  //     tv_id,
  //     season_number: Number(season_number),
  //     user_id: user.id,
  //   };
  //   const args = store.build_extra_args({ next_marker, page_size });
  //   const season = await store.prisma.season.findFirst({
  //     where,
  //     include: {
  //       profile: true,
  //     },
  //   });
  //   if (!season) {
  //     return e(Result.Err("没有匹配的记录"));
  //   }
  //   // const correct_list = season.profile.persons.slice(0, page_size);
  //   res.status(200).json({
  //     code: 0,
  //     msg: "",
  //     data: {
  //       next_marker: store.get_next_marker(season.profile.persons, { page_size }),
  //       list: correct_list.map((person) => {
  //         const { id, name, order, known_for_department, profile } = person;
  //         return {
  //           id,
  //           name,
  //           avatar: profile.profile_path,
  //           order,
  //           known_for_department,
  //         };
  //       }),
  //     },
  //   });
  //   return;
  // }
  // const where: ModelQuery<"person_profile"> = {};
  // const data = await store.list_with_cursor({
  //   fetch: (args) => {
  //     return store.prisma.person_profile.findMany({
  //       where,
  //       ...args,
  //     });
  //   },
  //   page_size,
  //   next_marker,
  // });
  // res.status(200).json({
  //   code: 0,
  //   msg: "",
  //   data: {
  //     ...data,
  //     list: data.list.map((person) => {
  //       const { id, name, profile_path, known_for_department } = person;
  //       return {
  //         id,
  //         name,
  //         avatar: profile_path,
  //         known_for_department,
  //         // source,
  //         // unique_id,
  //       };
  //     }),
  //   },
  // });
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      list: [],
    },
  });
}
