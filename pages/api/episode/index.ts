/**
 * @file 获取 episode 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

const { find_season, find_episodes } = store;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { query } = req;
  const { tv_id, season } = query as Partial<{
    tv_id: string;
    season: string;
  }>;
  const resp = await find_episodes(
    {
      tv_id,
      season,
    },
    { sorts: [{ key: "episode", order: "ASC" }] }
  );
  if (resp.error) {
    return e(resp);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: resp.data.map((e) => {
      const { id, episode, parent_file_id, season, file_id, file_name } = e;
      return {
        id,
        file_id,
        parent_file_id,
        file_name,
        episode,
        season,
      };
    }),
  });
}
