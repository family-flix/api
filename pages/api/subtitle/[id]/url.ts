/**
 * @file 获取存在云盘中的字幕文件访问地址
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { Drive } from "@/domains/drive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const subtitle = await store.prisma.subtitle.findFirst({
    where: {
      id,
      user_id: member.user.id,
    },
  });
  if (!subtitle) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { drive_id } = subtitle;
  const drive_res = await Drive.Get({ id: drive_id, user: member.user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const client = drive_res.data.client;
  const profile_res = await client.fetch_file_download_url(subtitle.file_id);
  if (profile_res.error) {
    return e(profile_res);
  }
  res.status(200).json({ code: 0, msg: "", data: profile_res.data });
}
