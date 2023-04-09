/**
 * @file 获取影片播放信息
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store/sqlite";

const { find_episode } = store;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { query } = req;
  const {
    tv_id,
    season,
    episode = "E01",
  } = query as Partial<{
    tv_id: string;
    season: string;
    episode: string;
  }>;
  if (!tv_id) {
    return e("请指定 tv");
  }
  if (!episode) {
    return e("请指定集数");
  }
  const user_id = "xbxehcq4x8vhsl7";
  const drive_id = "Xqr39EL7PZvXQKr";
  const episode_resp = await find_episode({
    tv_id,
    episode,
  });
  if (episode_resp.error) {
    return e(episode_resp);
  }
  if (!episode_resp.data) {
    return e("No matched record of episode");
  }
  const { file_id } = episode_resp.data;
  const client = new AliyunDriveClient({
    drive_id,
    store: store,
  });
  const resp = await client.fetch_video_preview_info(file_id);
  if (resp.error) {
    return e(resp);
  }
  res.status(200).json({ code: 0, msg: "", data: resp.data });
}
