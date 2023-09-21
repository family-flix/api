/**
 * @file 获取指定视频文件播放信息
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { Drive } from "@/domains/drive";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, type } = req.query as Partial<{
    /** 文件 id */
    id: string;
    type: string;
  }>;
  if (!id) {
    return e("缺少文件 id");
  }
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: member_id, user } = t_res.data;
  // console.log("[Endpoint]episode/[id]", user_id, t_resp.data);
  const file = await store.prisma.file.findFirst({
    where: {
      file_id: id,
    },
  });
  if (file === null) {
    return e("没有匹配的文件记录");
  }
  const { file_id, drive_id } = file;
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
  if (play_info_res.data.sources.length === 0) {
    return e("该文件暂时不可播放，请等待一段时间后重试");
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
    file_id: string;
    thumbnail: string;
    url: string;
    type: string;
    width: number;
    height: number;
  }>;
  // 只有一种分辨率，直接返回该分辨率视频
  const recommend = (() => {
    if (play_info_res.data.sources.length === 1) {
      return play_info_res.data.sources[0];
    }
    const matched_resolution = play_info_res.data.sources.find((r) => {
      return r.type === type;
    });
    if (matched_resolution) {
      return matched_resolution;
    }
    return play_info_res.data.sources[0];
  })();
  if (recommend.url.includes("x-oss-additional-headers=referer")) {
    return e("视频文件无法播放，请修改 refresh_token");
  }
  (() => {
    const { url, type, width, height } = recommend;
    const result: MediaFile & { other: MediaFile[]; subtitles: { type: number; language: string; url: string }[] } = {
      id,
      file_id,
      url,
      thumbnail,
      type,
      width,
      height,
      // 其他分辨率的视频源
      other: play_info_res.data.sources.map((source) => {
        const { url, type, width, height } = source;
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
        const { subtitles } = play_info_res.data;
        return subtitles.map((subtitle) => {
          const { id, name, url, language } = subtitle;
          return {
            type: 1,
            id,
            name,
            url,
            language,
          };
        });
      })(),
    };
    res.status(200).json({ code: 0, msg: "", data: result });
  })();
}
