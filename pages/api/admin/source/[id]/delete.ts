/**
 * @file 删除指定视频源（不删除文件）
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
  const { id: source_id } = req.query as Partial<{ id: string }>;
  if (!source_id) {
    return e(Result.Err("缺少影片 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const source = await (async () => {
    const episode_source = await store.prisma.parsed_episode.findFirst({
      where: {
        id: source_id,
        user_id: user.id,
      },
    });
    if (episode_source) {
      return {
        id: episode_source.id,
        file_id: episode_source.file_id,
        drive_id: episode_source.drive_id,
      };
    }
    const movie_source = await store.prisma.parsed_movie.findFirst({
      where: {
        id: source_id,
        user_id: user.id,
      },
    });
    if (movie_source) {
      return {
        id: movie_source.id,
        file_id: movie_source.file_id,
        drive_id: movie_source.drive_id,
      };
    }
    return null;
  })();
  if (!source) {
    return e(Result.Err("没有匹配的影片记录"));
  }
  const { drive_id, file_id } = source;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  await store.prisma.file.deleteMany({
    where: {
      file_id: file_id,
      user_id: user.id,
    },
  });
  const r = await drive.client.to_trash(file_id);
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "删除成功", data: null });
}
