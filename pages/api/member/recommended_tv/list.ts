/**
 * @file 获取 tv 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { store } from "@/store";
import { parse_token, response_error_factory } from "@/utils/backend";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { page = "1", pageSize: page_size = "20" } = req.query as Partial<{
    page: string;
    pageSize: string;
  }>;
  const { all, get } = store.operation;
  const { authorization } = req.headers;
  const t_resp = parse_token(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { member_id, is_member } = t_resp.data;
  if (!is_member) {
    return e("只有成员才能获取推荐影片列表");
  }
  const condition = ` tv.id IN (SELECT recommended_tv.tv_id FROM recommended_tv WHERE member_id = '${member_id}')`;
  const count_resp = await (async () => {
    const simple_sql2 = `SELECT COUNT(*) count FROM tv LEFT JOIN searched_tv ON tv.searched_tv_id = searched_tv.id WHERE ${condition};`;
    const r1 = await get<{ count: number }>(simple_sql2);
    if (r1.error) {
      return r1;
    }
    return Result.Ok(r1.data.count);
  })();
  if (count_resp.error) {
    return e(count_resp);
  }
  const number_page = Number(page);
  const number_size = Number(page_size);
  const fields =
    "tv.id,searched_tv.name,searched_tv.original_name,searched_tv.overview,searched_tv.poster_path,searched_tv.first_air_date";
  let simple_sql = `SELECT ${fields} FROM tv LEFT JOIN searched_tv ON tv.searched_tv_id = searched_tv.id WHERE ${condition} ORDER BY searched_tv.first_air_date DESC`;
  simple_sql += ` LIMIT ${(number_page - 1) * number_size}, ${number_size}`;
  simple_sql += ";";
  const resp = await all<
    {
      id: string;
      name: string;
      original_name: string;
      overview: string;
      poster_path: string;
    }[]
  >(simple_sql);
  if (resp.error) {
    return e(resp);
  }
  const data = {
    total: count_resp.data,
    no_more: (() => {
      if (number_page * number_size >= count_resp.data) {
        return true;
      }
      return false;
    })(),
    list: resp.data,
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
