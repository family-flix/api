/**
 * @file 删除指定字幕及文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { FileType } from "@/constants";
import { Drive } from "@/domains/drive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { subtitle_id } = req.query as Partial<{
    subtitle_id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!subtitle_id) {
    return e(Result.Err("缺少字幕 id"));
  }
  const subtitle = await store.prisma.subtitle.findFirst({
    where: {
      id: subtitle_id,
      user_id: user.id,
    },
  });
  if (!subtitle) {
    return e(Result.Err("没有匹配的记录"));
  }
  const drive_res = await Drive.Get({ id: subtitle.drive_id, user_id: user.id, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const r = await drive.client.delete_file(subtitle.file_id);
  if (r.error) {
    return e(r);
  }
  await store.prisma.subtitle.deleteMany({
    where: {
      file_id: subtitle.file_id,
    },
  });
  await store.prisma.file.deleteMany({
    where: {
      file_id: subtitle.file_id,
    },
  });
  res.status(200).json({
    code: 0,
    msg: "删除成功",
    data: null,
  });
}
