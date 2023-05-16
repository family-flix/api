/**
 * @file 获取指定用户的成员
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
  const { page = "1", page_size = "20" } = req.query as Partial<{
    page: string;
    page_size: string;
  }>;
  const token_resp = await User.New(authorization);
  if (token_resp.error) {
    return e(token_resp);
  }
  const { id: user_id } = token_resp.data;
  const r1 = await store.find_member_with_pagination(
    {
      where: {
        user_id,
      },
    },
    {
      page: Number(page),
      size: Number(page_size),
    }
  );
  if (r1.error) {
    return e(r1);
  }
  for (let i = 0; i < r1.data.list.length; i += 1) {
    const member = r1.data.list[i];
    const { id } = member;
    const r2 = await store.find_member_link_with_pagination({
      where: {
        member_id: id,
      },
    });
    // @ts-ignore
    member.links = [];
    if (r2.data && r2.data.list.length) {
      // @ts-ignore
      member.links = r2.data.list.map((l) => {
        const { token } = l;
        const link = `/?token=${token}`;
        return {
          ...l,
          link,
        };
      });
    }
    // const fields =
    //   "tv.id,searched_tv.name,searched_tv.original_name,searched_tv.overview,searched_tv.poster_path,searched_tv.first_air_date";
    // const r3 = await all<
    //   {
    //     id: string;
    //     name: string;
    //     original_name: string;
    //     poster_path: string;
    //   }[]
    // >(
    //   `SELECT ${fields} FROM tv LEFT JOIN searched_tv ON tv.searched_tv_id = searched_tv.id WHERE tv.id IN (SELECT recommended_tv.tv_id FROM recommended_tv WHERE member_id = '${id}');`
    // );
    // // @ts-ignore
    // member.recommended_tvs = [];
    // if (r3.data && r3.data.length) {
    //   // @ts-ignore
    //   member.recommended_tvs = r3.data;
    // }
  }
  res.status(200).json({ code: 0, msg: "", data: r1.data });
}
