/**
 * @file 获取指定剧集播放信息
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { Member } from "@/domains/user/member";
import { Drive } from "@/domains/drive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, type = "LD" } = req.query as Partial<{
    /** 剧集 id */
    id: string;
    /** 分辨率 */
    type: string;
  }>;
  if (!id) {
    return e("缺少影片 id");
  }
  const t_res = await Member.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: member_id, user } = t_res.data;
  // console.log("[Endpoint]episode/[id]", user_id, t_resp.data);
  const episode = await store.prisma.episode.findFirst({
    where: {
      id,
    },
    include: {
      profile: true,
      parsed_episodes: true,
    },
  });
  if (episode === null) {
    return e("没有匹配的影片记录");
  }
  const { season_number, episode_number, profile, parsed_episodes } = episode;
  const source = (() => {
    if (parsed_episodes.length === 0) {
      return null;
    }
    const matched = parsed_episodes.find((parsed_episode) => {
      const { file_name } = parsed_episode;
      if (file_name.includes("4K") || file_name.includes("超清")) {
        return true;
      }
      return false;
    });
    if (matched) {
      return matched;
    }
    return parsed_episodes[0];
  })();
  if (source === null) {
    return e("该影片没有可播放的视频源");
  }
  const { file_id, drive_id } = source;
  const drive_res = await Drive.Get({ id: drive_id, user_id: user.id, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const client = drive.client;
  const play_info_res = await client.fetch_video_preview_info(file_id);
  if (play_info_res.error) {
    return e(play_info_res);
  }
  if (play_info_res.data.length === 0) {
    return e("该影片暂时不可播放，请等待一段时间后重试");
  }
  const file_profile_res = await client.fetch_file(file_id);
  if (file_profile_res.error) {
    return e(file_profile_res);
  }
  const { thumbnail } = file_profile_res.data;
  type MediaFile = Partial<{
    id: string;
    name: string;
    overview: string;
    season_number: string;
    episode_number: string;
    file_id: string;
    thumbnail: string;
    url: string;
    type: string;
    width: number;
    height: number;
  }>;
  // 只有一种分辨率，直接返回该分辨率视频
  const recommend = (() => {
    if (play_info_res.data.length === 1) {
      return play_info_res.data[0];
    }
    const matched_resolution = play_info_res.data.find((r) => {
      return r.type === type;
    });
    if (matched_resolution) {
      return matched_resolution;
    }
    return play_info_res.data[0];
  })();
  if (recommend.url.includes("x-oss-additional-headers=referer")) {
    return e("视频文件无法播放，请修改 refresh_token");
  }
  const { name, overview } = profile;
  (() => {
    const { url, type, width, height } = recommend;
    const result: MediaFile & { other: MediaFile[] } = {
      id,
      name: name || episode_number,
      overview: overview || "",
      season_number,
      episode_number,
      file_id,
      url,
      thumbnail,
      type,
      width,
      height,
      // 其他分辨率的视频源
      other: play_info_res.data.map((res) => {
        const { url, type, width, height } = res;
        return {
          id: file_id,
          file_id,
          url,
          thumbnail,
          type,
          width,
          height,
        };
      }),
    };
    res.status(200).json({ code: 0, msg: "", data: result });
  })();
}
