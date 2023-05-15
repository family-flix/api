/**
 * @file 获取当前用户指定 tv 的影片播放历史
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { tv_id } = req.query as Partial<{
    tv_id: string;
  }>;
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: member_id } = t_res.data;
  const history_res = await store.find_history({
    tv_id,
    member_id,
  });
  if (history_res.error) {
    return e(history_res);
  }
  if (!history_res.data) {
    return e("No matched record of history");
  }
  const {
    id: history_id,
    duration,
    current_time,
    episode_id,
  } = history_res.data;
  const episode_res = await store.find_episode({ id: episode_id });
  if (episode_res.error) {
    return e(episode_res);
  }
  if (!episode_res.data) {
    return e("No matched record of history");
  }
  const { season, episode } = episode_res.data;
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      id: history_id,
      episode_id,
      current_time,
      duration,
      season,
      episode,
    },
  });
}
