/**
 * @file 删除指定 tv 的指定影片
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: episode_id, tv_id } = req.query as Partial<{ id: string; tv_id: string }>;
  if (!episode_id) {
    return e("缺少影片 id");
  }
  if (!tv_id) {
    return e("缺少电视剧 id");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const episode = await store.prisma.episode.findFirst({
    where: {
      id: episode_id,
      user_id,
    },
    include: {
      parsed_episodes: true,
    },
  });
  // const matched_episode_res = await store.find_episode({
  //   id: episode_id,
  //   user_id,
  // });
  if (!episode) {
    return e("没有匹配的影片记录");
  }
  const matched_play_history_res = await store.find_history({
    episode_id: episode_id,
  });
  if (!matched_play_history_res.error) {
    return e(matched_play_history_res);
  }
  if (matched_play_history_res.data) {
    return e("该影片正在被观看，无法删除");
  }
  const { parsed_episodes } = episode;
  for (let i = 0; i < parsed_episodes.length; i += 1) {
    const parsed_episode = parsed_episodes[i];
    const { drive_id, file_id } = parsed_episode;
    const drive_res = await Drive.Get({ id: drive_id, user_id, store });
    if (drive_res.error) {
      continue;
    }
    const drive = drive_res.data;
    const r = await drive.client.delete_file(file_id);
    if (r.error) {
      continue;
    }
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
