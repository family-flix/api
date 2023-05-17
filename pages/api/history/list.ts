/**
 * @file 获取指定用户播放历史
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, resultify } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { Member } from "@/domains/user/member";

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

  const t_res = await Member.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  // const count_sql = `SELECT COUNT(*) count
  // FROM play_progress pp
  // INNER JOIN episode e ON pp.episode_id = e.id
  // LEFT JOIN tv t ON e.tv_id = t.id
  // LEFT JOIN searched_tv st ON t.tv_profile_id = st.id
  // WHERE pp.member_id = '${user_id}'`;
  // const sql = `SELECT
  // t.id,
  // st.name,
  // st.original_name,
  // st.poster_path,
  // st.first_air_date,
  // ss.air_date,
  // e.episode,
  // e.season,
  // ss.episode_count,
  // pp.current_time,
  // pp.duration,
  // pp.updated,
  // (SELECT COUNT(*) FROM (SELECT DISTINCT episode FROM episode WHERE tv_id = t.id AND episode.season = e.season)) AS cur_episode_count,
  // (SELECT created FROM episode WHERE tv_id = t.id AND created = (SELECT MAX(created) FROM episode WHERE tv_id = t.id)) AS latest_episode
  // FROM play_progress pp
  // INNER JOIN episode e ON pp.episode_id = e.id
  // LEFT JOIN tv t ON e.tv_id = t.id
  // LEFT JOIN searched_tv st ON t.tv_profile_id = st.id
  // LEFT JOIN searched_season ss ON t.tv_profile_id = ss.tv_profile_id AND ss.season_number = CAST(REPLACE(e.season, 'S', '') AS INT)
  // WHERE pp.member_id = '${user_id}'
  // `;
  // const m = records_pagination_using_sql(sql, count_sql, store.operation);
  // const r = await m({
  //   page: Number(page),
  //   page_size: Number(page_size),
  //   sorts: [
  //     {
  //       key: "pp.updated",
  //       order: "DESC",
  //     },
  //   ],
  // });
  const count_resp = await resultify(
    store.prisma.playHistory.count.bind(store.prisma.playHistory)
  )({
    where: {
      member_id: user_id,
    },
  });
  if (count_resp.error) {
    return e(count_resp);
  }
  const r = await resultify(
    store.prisma.playHistory.findMany.bind(store.prisma.playHistory)
  )({
    select: {
      id: true,
      current_time: true,
      duration: true,
      updated: true,
      episode: {
        select: {
          id: true,
          episode: true,
          season: true,
          // created: {
          //   select: {
          //     created: true,
          //   },
          //   orderBy: {
          //     created: "desc",
          //   },
          //   take: 1,
          // },
          tv: {
            select: {
              id: true,
              searched_tv: {
                select: {
                  id: true,
                  name: true,
                  original_name: true,
                  poster_path: true,
                  first_air_date: true,
                },
              },
              // searchedSeason: {
              //   select: {
              //     air_date: true,
              //     episode_count: true,
              //   },
              //   where: {
              //     season_number: {
              //       equals: parseInt(e.season.replace("S", "")),
              //     },
              //   },
              // },
            },
          },
        },
      },
    },
    where: {
      member_id: user_id,
    },
    orderBy: {
      updated: "desc",
    },
    skip: (Number(page) - 1) * Number(page_size),
    take: Number(page_size),
  });

  if (r.error) {
    return e(r);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      total: count_resp.data,
      list: r.data,
      page,
      pageSize: page_size,
    },
  });
}
