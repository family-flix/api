/**
 * @file 重命名指定文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/v2";
import { FileRecord } from "@/domains/store/types";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { FileType } from "@/constants/index";

export default async function v2_drive_file_rename(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { drive_id, file_id, name } = req.body as Partial<{ name: string; drive_id: string; file_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  if (!file_id) {
    return e(Result.Err("缺少文件 id"));
  }
  if (!name) {
    return e(Result.Err("缺少新的文件名"));
  }
  const user = t_res.data;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(Result.Err(drive_res.error.message));
  }
  const drive = drive_res.data;
  const r = await drive.rename_file({ file_id }, { name });
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const file = await store.prisma.file.findFirst({
    where: {
      file_id,
      user_id: user.id,
    },
  });
  if (file) {
    const { id, type, parent_paths } = file;
    await store.prisma.file.update({
      where: {
        id,
      },
      data: {
        name,
      },
    });
    // if (type === FileType.Folder) {
    //   await store.prisma.file.updateMany({
    //     where: {
    //       parent_file_id: file.file_id,
    //     },
    //     data: {
    //       // 更新子文件的「父路径」字段值
    //     },
    //   });
    // }
    if (type === FileType.File) {
      const parsed_episode = await store.prisma.parsed_media_source.findFirst({
        where: {
          file_id,
          user_id: user.id,
        },
      });
      if (parsed_episode) {
        await store.prisma.parsed_media_source.delete({
          where: {
            id: parsed_episode.id,
          },
        });
      }
    }
  }
  return res.status(200).json({ code: 0, msg: "重命名成功", data: null });
}
