/**
 * @file 获取文件播放信息
 * @deprecated 使用 /api/admin/season/[id]/preview
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id: id, drive_id } = req.body as Partial<{ file_id: string; drive_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少文件 id"));
  }
  const drive_id_res = await (async () => {
    if (drive_id) {
      return Result.Ok(drive_id);
    }
    const file = await store.prisma.file.findFirst({
      where: {
        file_id: id,
      },
    });
    if (!file) {
      return Result.Err("没有匹配的记录");
    }
    return Result.Ok(file.drive_id);
  })();
  if (drive_id_res.error) {
    return e(drive_id_res);
  }
  const drive_res = await Drive.Get({ id: drive_id_res.data, user, store });
  if (drive_res.error) {
    return Result.Err(drive_res.error.message);
  }
  const drive = drive_res.data;
  const r = await drive.client.fetch_video_preview_info(id);
  if (r.error) {
    return e(r);
  }
  const info = r.data;
  if (info.sources.length === 0) {
    return e(Result.Err("该文件暂时不可播放，请等待一段时间后重试"));
  }
  const file_profile_res = await drive.client.fetch_file(id);
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
        id,
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
  res.status(200).json({ code: 0, msg: "", data: result });
}
