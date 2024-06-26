/**
 * @file 获取指定剧集播放信息
 * @deprecated 没必要，有 api/admin/file/[file_id] 即直接获取源播放地址的方法？
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { store } from "@/store/index";
import { Member } from "@/domains/user/member";
import { Drive } from "@/domains/drive/v2";
import { response_error_factory } from "@/utils/server";
import { BaseApiResp, Result } from "@/types/index";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    id,
    file_id: fid,
    type = "LD",
  } = req.body as Partial<{
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
      subtitles: true,
    },
  });
  if (episode === null) {
    return e(Result.Err("没有匹配的影片记录"));
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
    return e(Result.Err("该视频源不存在"));
  }
  const { file_id, drive_id } = source;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
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
    thumbnail: string | null;
    url: string;
    type: string;
    width: number;
    height: number;
  }>;
  const recommend_resolution = (() => {
    // 只有一种分辨率，直接返回该分辨率视频
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
  if (recommend_resolution.url.includes("x-oss-additional-headers=referer")) {
    return e(Result.Err("视频文件无法播放，请修改 refresh_token"));
  }
  const { name, overview } = profile;
  const { url, type: t, width, height } = recommend_resolution;
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
    subtitles: (() => {
      const { subtitles } = info;
      return subtitles
        .map((subtitle) => {
          const { id, name, url, language } = subtitle;
          return {
            type: 1,
            id,
            name,
            url,
            language,
          };
        })
        .concat(
          episode.subtitles.map((subtitle) => {
            const { id, file_id, name, language } = subtitle;
            return {
              type: 2,
              id,
              name,
              url: file_id,
              language,
            };
          }) as {
            id: string;
            type: 1 | 2;
            url: string;
            name: string;
            language: "chi" | "eng" | "jpn";
          }[]
        );
    })(),
  };
  res.status(200).json({ code: 0, msg: "", data: result });
}
