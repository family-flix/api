/**
 * @file 获取未知电视剧详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { EpisodeRecord } from "@/store/types";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少电视剧 id 参数");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const r = await store.find_maybe_tv({ id, user_id });
  if (r.error) {
    return e(r);
  }
  if (!r.data) {
    return e("No matched record of unknown tv");
  }
  const episodes_res = await store.find_episodes({ tv_id: id });
  if (episodes_res.error) {
    return e(episodes_res);
  }
  const { name, original_name, file_id, file_name } = r.data;
  const episodes = episodes_res.data;
  function num(episode: string) {
    const matched = episode.match(/[eE]([0-9]{1,})/);
    if (!matched) {
      return 0;
    }
    return Number(matched[1]);
  }
  const folders = episodes
    .sort((a, b) => num(a.episode) - num(b.episode))
    .reduce((r, cur) => {
      const { parent_paths } = cur;
      const matched = r.find((rr) => rr.paths === parent_paths);
      if (!matched) {
        return r.concat([
          {
            paths: parent_paths,
            episodes: [cur],
          },
        ]);
      }
      matched.episodes.push(cur);
      return r;
    }, [] as { paths: string; episodes: EpisodeRecord[] }[]);
  const result = {
    id,
    name: name || original_name,
    file_id,
    file_name,
    folders,
  };
  res.status(200).json({ code: 0, msg: "", data: result });
}
