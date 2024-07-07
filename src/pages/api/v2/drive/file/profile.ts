/**
 * @file 获取文件详情
 * 1、该文件是否有解析出影视剧
 * 2、影视剧信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/index";
import { FileType } from "@/constants/index";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_drive_file_profile(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id, drive_id } = req.body as Partial<{ file_id: string; drive_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!file_id) {
    return e(Result.Err("缺少文件 id"));
  }
  const file = await store.prisma.file.findFirst({
    where: {
      file_id: file_id,
      user_id: user.id,
    },
  });
  if (!file) {
    return e(Result.Err("没有匹配的记录"));
  }
  const drive_res = await Drive.Get({ id: file.drive_id, user, store });
  if (drive_res.error) {
    return e(Result.Err(drive_res.error.message));
  }
  const drive = drive_res.data;
  const file_profile_res = await drive.client.fetch_file(file_id);
  if (file_profile_res.error) {
    return e(Result.Err(file_profile_res.error.message));
  }
  const { type, content_hash, thumbnail, name, size, mime_type } = file_profile_res.data;
  const is_file = type === "file";
  const data: Record<string, unknown> = {
    id: file_id,
    type: is_file ? FileType.File : FileType.Folder,
    file_name: name,
    content_hash: is_file ? content_hash : null,
    size: is_file ? size : null,
    thumbnail_path: is_file ? thumbnail : null,
    mime_type,
    media: null,
    unknown_media: null,
  };
  await (async () => {
    if (file.type === FileType.File) {
      const parsed_source = await store.prisma.parsed_media_source.findFirst({
        where: {
          file_id: file.file_id,
          user_id: user.id,
        },
        include: {
          media_source: {
            include: {
              media: {
                include: {
                  profile: true,
                },
              },
              profile: true,
            },
          },
          parsed_media: {
            include: {
              media_profile: true,
            },
          },
        },
      });
      if (!parsed_source) {
        return;
      }
      const { media_source, parsed_media, season_text, episode_text } = parsed_source;
      if (media_source) {
        // 1、所属影视剧信息正确，「剧集」信息也正确
        const { id, type, profile: media_profile } = media_source.media;
        const { name, poster_path, order } = media_profile;
        data.media = {
          id,
          step: 3,
          type,
          name,
          poster_path,
          episode_text: null,
          episode_name: `${media_source.profile.order}、${media_source.profile.name}`,
        };
        return;
      }
      if (parsed_media && parsed_media.media_profile) {
        // 2、所属影视剧信息正确，但该「剧集」信息匹配失败
        const { id, media_profile } = parsed_media;
        const { type, name, poster_path } = media_profile;
        data.media = {
          id,
          step: 2,
          type,
          name,
          poster_path,
          episode_text,
          episode_name: null,
        };
        return;
      }
      const { id, type, name, original_name } = parsed_source;
      // 3、所属影视剧信息匹配失败
      data.unknown_media = {
        id,
        step: 1,
        type,
        name,
        original_name,
        season_text,
        episode_text,
      };
    }
  })();
  return res.status(200).json({ code: 0, msg: "", data });
}
