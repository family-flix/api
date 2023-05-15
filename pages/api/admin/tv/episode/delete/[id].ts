/**
 * @file 删除指定 tv 的指定影片
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { User } from "@/domains/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, tv_id } = req.query as Partial<{ id: string; tv_id: string }>;
  if (!id) {
    return e("缺少影片 id 参数");
  }
  if (!tv_id) {
    return e("缺少电视剧 id 参数");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const matched_episode_res = await store.find_episode({
    id,
    user_id,
  });
  if (matched_episode_res.error) {
    return e(matched_episode_res);
  }
  if (!matched_episode_res.data) {
    return e(`没有 id 为 '${id}' 的影片`);
  }
  const episode = matched_episode_res.data;
  const matched_play_history_res = await store.find_history({
    episode_id: id,
  });
  if (!matched_play_history_res.error) {
    return e(matched_play_history_res);
  }
  if (matched_play_history_res.data) {
    return e("该影片正在被观看，无法删除");
  }
  const client = new AliyunDriveClient({ drive_id: episode.drive_id, store });
  const r = await client.delete_file(episode.file_id);
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
