/**
 * @file 获取指定剧集下的源播放信息
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { Drive } from "@/domains/drive";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    id,
    file_id: fid,
    type = "LD",
  } = req.query as Partial<{
    /** 剧集 id */
    id: string;
    file_id: string;
    /** 分辨率 */
    type: string;
  }>;
  if (!id) {
    return e(Result.Err("缺少影片 id"));
  }
  if (!fid) {
    return e(Result.Err("缺少源 id"));
  }
  const t_res = await Member.New(authorization, store);
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
  const { season_text, episode_text, profile, parsed_episodes } = episode;
  const source = (() => {
    if (parsed_episodes.length === 0) {
      return null;
    }
    const matched = parsed_episodes.find((parsed_episode) => {
      return parsed_episode.file_id === fid;
    });
    if (matched) {
      return matched;
    }
    return null;
  })();
  if (source === null) {
    return e("该视频源不存在");
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
  const info = play_info_res.data;
  if (info.sources.length === 0) {
    return e("该源暂时不可播放，请等待一段时间后重试");
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
    if (info.sources.length === 1) {
      return info.sources[0];
    }
    let matched_resolution = info.sources.find((r) => {
      return r.type === type;
    });
    if (matched_resolution) {
      return matched_resolution;
    }
    matched_resolution = info.sources.find((r) => {
      return !r.url.includes("pdsapi");
    });
    if (matched_resolution) {
      return matched_resolution;
    }

    return info.sources[0];
  })();
  if (recommend.url.includes("x-oss-additional-headers=referer")) {
    return e("视频文件无法播放，请修改 refresh_token");
  }
  const { name, overview } = profile;
  const { url, type: t, width, height } = recommend;
  const result: MediaFile & { other: MediaFile[]; subtitles: { language: string; url: string }[] } = {
    id,
    name: name || episode_text,
    overview: overview || "",
    season_number: season_text,
    episode_number: episode_text,
    file_id,
    url,
    thumbnail,
    type: t,
    width,
    height,
    // 其他分辨率的视频源
    other: info.sources.map((res) => {
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
    subtitles: info.subtitles,
  };
  res.status(200).json({ code: 0, msg: "", data: result });
}
