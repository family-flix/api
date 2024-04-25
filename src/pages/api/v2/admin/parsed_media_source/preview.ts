/**
 * @file 获取文件播放信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/v2";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_parsed_media_source_preview(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: source_id } = req.body as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!source_id) {
    return e(Result.Err("缺少文件 id"));
  }
  const source = await store.prisma.parsed_media_source.findFirst({
    where: {
      id: source_id,
      user_id: user.id,
    },
  });
  if (!source) {
    return e(Result.Err("没有匹配的影片记录"));
  }
  const { file_id, drive_id } = source;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(Result.Err(drive_res.error.message));
  }
  const drive = drive_res.data;
  const r = await drive.client.fetch_video_preview_info(file_id);
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const info = r.data;
  if (info.sources.length === 0) {
    return e(Result.Err("该文件暂时不可播放，请等待一段时间后重试"));
  }
  const file_profile_res = await drive.client.fetch_file(file_id);
  if (file_profile_res.error) {
    return e(file_profile_res);
  }
  const { thumbnail } = file_profile_res.data;
  type MediaFile = Partial<{
    file_id: string;
    thumbnail: string | null;
    url: string;
    type: string;
    width: number;
    height: number;
  }>;
  const recommend = (() => {
    // 只有一种分辨率，直接返回该分辨率视频
    if (info.sources.length === 1) {
      return info.sources[0];
    }
    return info.sources[0];
  })();
  if (recommend.url.includes("x-oss-additional-headers=referer")) {
    return e(Result.Err("视频文件无法播放，请修改 refresh_token"));
  }
  const { url, type, width, height } = recommend;
  const result: MediaFile & { other: MediaFile[]; subtitles: { language: string; url: string }[] } = {
    url,
    thumbnail,
    type,
    width,
    height,
    // 其他分辨率的视频源
    other: info.sources.map((res) => {
      const { url, type, width, height } = res;
      return {
        id: file_id,
        url,
        thumbnail,
        type,
        width,
        height,
      };
    }),
    subtitles: info.subtitles.map((subtitle) => {
      const { id, url, name, language } = subtitle;
      return {
        type: 1,
        id,
        name,
        url,
        language,
      };
    }),
  };
  return res.status(200).json({ code: 0, msg: "", data: result });
}
