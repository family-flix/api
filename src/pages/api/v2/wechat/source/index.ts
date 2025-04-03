/**
 * @file 获取指定文件播放信息
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { Drive } from "@/domains/drive/v2";
import { Drive115Client } from "@/domains/clients/115";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";
import { MediaOriginCountries, MediaResolutionTypes, SubtitleFileTypes, SubtitleLanguageMap } from "@/constants/index";
import { DriveAlistClient } from "@/domains/clients/alist";

export default async function v2_wechat_source_index(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, type = MediaResolutionTypes.SD } = req.body as Partial<{ id: string; type: string }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  if (!id) {
    return e(Result.Err("缺少视频文件 id"));
  }
  const source = await store.prisma.parsed_media_source.findFirst({
    where: {
      id,
      user_id: member.user.id,
    },
  });
  if (source === null) {
    return e(Result.Err("该视频源不存在"));
  }
  const { file_id, drive_id } = source;
  const drive_res = await Drive.Get({ id: drive_id, user: member.user, store });
  if (drive_res.error) {
    return e(Result.Err(drive_res.error.message));
  }
  const client = drive_res.data.client;
  const play_info_res = await client.fetch_video_preview_info(file_id);
  if (play_info_res.error) {
    return e(Result.Err(play_info_res.error.message));
  }
  const info = play_info_res.data;
  if (info.sources.length === 0) {
    return e(Result.Err("该源暂时不可播放，请切换其他源或等待一会重试"));
  }
  type MediaFile = Partial<{
    id: string;
    name: string;
    overview: string;
    season_number: string;
    episode_number: string;
    file_id: string;
    thumbnail_path: string;
    invalid: number;
    url: string;
    type: string;
    width: number;
    height: number;
  }>;
  const rr = await (async () => {
    if (client instanceof Drive115Client) {
      return Result.Ok({
        url: info.sources[0].url,
        width: info.sources[0].width,
        height: info.sources[0].height,
        thumbnail: info.thumb_url,
        recommend_resolution: info.sources[0],
      });
    }
    if (client instanceof DriveAlistClient) {
      return Result.Ok({
        url: info.sources[0].url,
        width: info.sources[0].width,
        height: info.sources[0].height,
        thumbnail: info.thumb_url,
        recommend_resolution: info.sources[0],
      });
    }
    const file_profile_res = await client.fetch_file(file_id);
    if (file_profile_res.error) {
      return e(Result.Err(file_profile_res.error.message));
    }
    const { thumbnail } = file_profile_res.data;
    let recommend_resolution = (() => {
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
    if (!recommend_resolution.url) {
      const matched = info.sources.find((s) => s.url);
      if (matched) {
        recommend_resolution = matched;
      }
    }
    const { url, width, height } = recommend_resolution;
    if (url.includes("x-oss-additional-headers=referer")) {
      return e(Result.Err("视频文件无法播放，请修改 refresh_token"));
    }
    return Result.Ok({
      url,
      width,
      height,
      thumbnail,
      recommend_resolution,
    });
  })();
  if (rr.error) {
    return e(rr);
  }
  const result: MediaFile & { other: MediaFile[]; subtitles: { language: MediaOriginCountries[]; url: string }[] } = {
    id,
    url: rr.data.url,
    thumbnail_path: rr.data.thumbnail || undefined,
    type: rr.data.recommend_resolution.type,
    width: rr.data.width,
    height: rr.data.height,
    invalid: 0,
    other: info.sources
      .map((res) => {
        const { url, type, width, height, invalid } = res;
        return {
          cur: rr.data.recommend_resolution.type === type,
          url,
          type,
          width,
          height,
          invalid,
        };
      })
      .filter((source) => {
        return !!source.url;
      }),
    subtitles: info.subtitles.map((subtitle) => {
      const { id, name, url, language } = subtitle;
      return {
        type: SubtitleFileTypes.MediaInnerFile,
        id,
        name,
        url,
        language: SubtitleLanguageMap[language] || [],
      };
    }),
  };
  return res.status(200).json({ code: 0, msg: "", data: result });
}
