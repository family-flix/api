/**
 * @file 获取指定用户播放历史
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { store } from "@/store/sqlite";
import { records_pagination_using_sql } from "@/store/operations";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { page = "1", page_size = "20" } = req.query as Partial<{
    episode_id: string;
    page: string;
    page_size: string;
  }>;

  const t_res = parse_token(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id, member_id, is_member } = t_res.data;
  const condition = is_member
    ? `pp.member_id = '${member_id}'`
    : `pp.user_id = '${user_id}'`;

  const count_sql = `SELECT COUNT(*) count
  FROM play_progress pp
  INNER JOIN episode e ON pp.episode_id = e.id
  LEFT JOIN tv t ON e.tv_id = t.id
  LEFT JOIN searched_tv st ON t.searched_tv_id = st.id
  WHERE ${condition}`;
  const sql = `SELECT
  t.id,
  st.name,
  st.original_name,
  st.poster_path,
  st.first_air_date,
  ss.air_date,
  e.episode,
  e.season,
  ss.episode_count,
  pp.current_time,
  pp.duration,
  pp.updated,
  (SELECT COUNT(*) FROM (SELECT DISTINCT episode FROM episode WHERE tv_id = t.id AND episode.season = e.season)) AS cur_episode_count,
  (SELECT created FROM episode WHERE tv_id = t.id AND created = (SELECT MAX(created) FROM episode WHERE tv_id = t.id)) AS latest_episode
  FROM play_progress pp
  INNER JOIN episode e ON pp.episode_id = e.id
  LEFT JOIN tv t ON e.tv_id = t.id
  LEFT JOIN searched_tv st ON t.searched_tv_id = st.id
  LEFT JOIN searched_season ss ON t.searched_tv_id = ss.searched_tv_id AND ss.season_number = CAST(REPLACE(e.season, 'S', '') AS INT)
  WHERE ${condition}
  `;
  const m = records_pagination_using_sql(sql, count_sql, store.operation);
  const r = await m({
    page: Number(page),
    page_size: Number(page_size),
    sorts: [
      {
        key: "pp.updated",
        order: "DESC",
      },
    ],
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: r.data,
  });
}
