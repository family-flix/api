/**
 * @file 获取文件详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { FileType } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id: id, drive_id } = req.query as Partial<{ file_id: string; drive_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少文件 id"));
  }
  const file = await store.prisma.file.findFirst({
    where: {
      file_id: id,
      user_id: user.id,
    },
  });
  const drive_id_res = await (async () => {
    if (drive_id) {
      return Result.Ok(drive_id);
    }
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
  const file_profile_res = await drive.client.fetch_file(id);
  if (file_profile_res.error) {
    return e(file_profile_res);
  }
  const { content_hash, thumbnail, mime_type } = file_profile_res.data;
  const data: Record<string, unknown> = {
    id,
    content_hash,
    thumbnail,
    mime_type,
  };
  if (file) {
    if (file.type === FileType.Folder) {
      const parsed_tv = await store.prisma.parsed_tv.findFirst({
        where: {
          file_id: file.file_id,
          user_id: user.id,
        },
        include: {
          tv: {
            include: {
              profile: true,
            },
          },
        },
      });
      data.parsed_tv = null;
      if (parsed_tv) {
        data.parsed_tv = {
          id: parsed_tv.id,
          profile: parsed_tv.tv
            ? {
                name: parsed_tv.tv.profile.name,
                original_name: parsed_tv.tv.profile.original_name,
                poster_path: parsed_tv.tv.profile.poster_path,
                overview: parsed_tv.tv.profile.overview,
              }
            : null,
        };
      }
    }
    if (file.type === FileType.File) {
      const parsed_episode = await store.prisma.parsed_episode.findFirst({
        where: {
          file_id: file.file_id,
          user_id: user.id,
        },
      });
      data.parsed_episode = null;
      if (parsed_episode) {
        data.parsed_episode = {
          id: parsed_episode.id,
          episode_text: parsed_episode.episode_number,
        };
      }
    }
  }
  res.status(200).json({ code: 0, msg: "", data });
}
