/**
 * @file 获取指定 episode 同一个 season 的文件夹列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { find_folders_and_recommended_path_in_special_season } from "@/domains/walker/utils";
import { store } from "@/store";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("Missing id");
  }
  const t_res = parse_token(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const episode_res = await store.find_episode({ id });
  if (episode_res.error) {
    return e(episode_res);
  }
  if (!episode_res.data) {
    return e("No matched record of episode");
  }
  const { season, tv_id } = episode_res.data;
  const r = await find_folders_and_recommended_path_in_special_season(
    tv_id,
    season,
    store
  );
  if (r.error) {
    return e(r);
  }
  if (r.data === null) {
    res.status(200).json({ code: 0, msg: "", data: [] });
    return;
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: Object.keys(r.data.episodes).map((paths) => {
      return {
        parent_paths: paths,
        episodes: r.data.episodes[paths],
      };
    }),
  });
}
