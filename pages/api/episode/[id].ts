/**
 * @file 获取影片详情
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { Member } from "@/domains/user/member";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { query } = req;
  const { id, type = "LD" } = query as Partial<{
    id: string;
    type: string;
  }>;
  if (!id) {
    return e("Missing tv id");
  }
  const { authorization } = req.headers;
  const t_resp = await Member.New(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  // console.log("[Endpoint]episode/[id]", user_id, t_resp.data);
  const episodes_resp = await store.find_episode({
    id,
  });
  if (episodes_resp.error) {
    return e(episodes_resp);
  }
  if (!episodes_resp.data) {
    return e("No matched record");
  }
  const { episode, season, tv_id, file_id, parent_paths, parent_file_id, file_name } = episodes_resp.data;
  const tv_resp = await store.find_parsed_tv({ id: tv_id });
  if (tv_resp.error) {
    return e(tv_resp);
  }
  if (!tv_resp.data) {
    return e("No matched record");
  }
  const { drive_id, user_id: owner_id } = tv_resp.data;
  if (owner_id !== user_id) {
    return e("No matched record");
  }
  const client = new AliyunDriveClient({
    drive_id,
    store: store,
  });
  const play_info_resp = await client.fetch_video_preview_info(file_id);
  if (play_info_resp.error) {
    return e(play_info_resp);
  }
  if (play_info_resp.data.length === 0) {
    return e("该影片暂时不可播放，请等待一段时间后重试");
  }

  const profile_resp = await client.fetch_file(file_id);
  if (profile_resp.error) {
    return e(profile_resp);
  }
  const { thumbnail } = profile_resp.data;
  type EpisodeForPlay = Partial<{
    id: string;
    season: string;
    episode: string;
    file_id: string;
    parent_paths: string;
    file_name: string;
    thumbnail: string;
    url: string;
    type: string;
    width: number;
    height: number;
  }>;
  // 只有一种分辨率，直接返回该分辨率视频
  if (play_info_resp.data.length === 1) {
    const result: EpisodeForPlay & { other: EpisodeForPlay[] } = {
      ...play_info_resp.data[0],
      id,
      file_id,
      parent_paths,
      file_name,
      thumbnail,
      episode,
      season,
      other: play_info_resp.data,
    };
    return res.status(200).json({ code: 0, msg: "", data: result });
  }
  const matched_resolution = play_info_resp.data.find((r) => {
    return r.type === type;
  });
  if (!matched_resolution) {
    // 没有和目标分辨率一致的，直接返回第一个分辨率的视频
    const result: EpisodeForPlay & { other: EpisodeForPlay[] } = {
      ...play_info_resp.data[0],
      id,
      file_id,
      file_name,
      parent_paths,
      thumbnail,
      episode,
      season,
      other: play_info_resp.data,
    };
    return res.status(200).json({ code: 0, msg: "", data: result });
  }
  const result = {
    ...matched_resolution,
    id,
    file_id,
    file_name,
    parent_paths,
    thumbnail,
    episode,
    season,
    other: play_info_resp.data,
  };
  res.status(200).json({ code: 0, msg: "", data: result });
}
