/**
 * @file 获取需要处理的 tv 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { store } from "@/store";
import {
  exchange_user_id,
  parse_token,
  response_error_factory,
} from "@/utils/backend";
import { process_db_value } from "@/store/operations";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const { all, get } = store.operation;
  const e = response_error_factory(res);
  const {
    name,
    page = "1",
    pageSize: page_size = "20",
  } = req.query as Partial<{
    name: string;
    page: string;
    pageSize: string;
  }>;
  const { authorization } = req.headers;
  const t_resp = parse_token(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  // console.log("[API]tv/list - token", t_resp.data);
  const user_id_resp = await exchange_user_id(t_resp.data);
  if (user_id_resp.error) {
    return e(user_id_resp);
  }
  const { id: user_id } = user_id_resp.data;
  const condition = `tv.searched_tv_id != '' AND st.first_air_date != '' AND tv.user_id = '${user_id}'`;
  const count_resp = await (async () => {
    const simple_sql2 = `SELECT COUNT(*) count
    FROM tv_need_complete tv
    LEFT JOIN searched_tv st ON tv.searched_tv_id = st.id
    LEFT JOIN tv t ON t.searched_tv_id = st.id
    LEFT JOIN searched_season ss ON tv.searched_season_id = ss.id
    WHERE ${condition};`;
    const sql2 = `SELECT COUNT(*) count
    FROM tv_need_complete tv
    LEFT JOIN searched_tv st ON tv.searched_tv_id = st.id
    LEFT JOIN tv t ON t.searched_tv_id = st.id
    LEFT JOIN searched_season ss ON tv.searched_season_id = ss.id
    WHERE ${condition} AND st.name ${process_db_value(
      `%${name}%`
    )} OR st.original_name ${process_db_value(`%${name}%`)}`;
    const running_sql = name ? sql2 : simple_sql2;
    const r1 = await get<{ count: number }>(running_sql);
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
    "tv.id,tv.episode_count,tv.cur_count AS cur_episode_count,t.id AS tv_id,st.name,st.original_name,st.overview,st.poster_path,st.first_air_date,st.tmdb_id,ss.name AS season_name,ss.season_number as season_number";
  let simple_sql = `
    SELECT ${fields}
    FROM tv_need_complete tv
    LEFT JOIN searched_tv st ON tv.searched_tv_id = st.id
    LEFT JOIN tv t ON t.searched_tv_id = st.id
    LEFT JOIN searched_season ss ON tv.searched_season_id = ss.id
    WHERE ${condition}
    ORDER BY st.first_air_date DESC`;
  let sql = `SELECT ${fields}
  FROM tv_need_complete tv
  LEFT JOIN searched_tv st ON tv.searched_tv_id = st.id
    LEFT JOIN tv t ON t.searched_tv_id = st.id
  LEFT JOIN searched_season ss ON tv.searched_season_id = ss.id
  WHERE ${condition} AND st.name ${process_db_value(
    `%${name}%`
  )} OR st.original_name ${process_db_value(
    `%${name}%`
  )} ORDER BY st.first_air_date DESC`;
  sql += ` LIMIT ${(number_page - 1) * number_size}, ${number_size}`;
  simple_sql += ` LIMIT ${(number_page - 1) * number_size}, ${number_size}`;
  sql += ";";
  simple_sql += ";";
  const running_sql = name ? sql : simple_sql;
  const resp = await all<
    {
      id: string;
      name: string;
      original_name: string;
      overview: string;
      poster_path: string;
    }[]
  >(running_sql);
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
