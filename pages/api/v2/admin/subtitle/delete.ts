/**
 * @file 删除指定字幕及文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store/index";
import { User } from "@/domains/user/index";
import { FileManage } from "@/domains/uploader/index";
import { BaseApiResp, Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { SubtitleFileTypes } from "@/constants/index";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { subtitle_id } = req.body as Partial<{
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
  const subtitle = await store.prisma.subtitle_v2.findFirst({
    where: {
      id: subtitle_id,
      user_id: user.id,
    },
  });
  if (!subtitle) {
    return e(Result.Err("没有匹配的记录"));
  }
  await store.prisma.subtitle_v2.delete({
    where: {
      id: subtitle.id,
    },
  });
  if (subtitle.type === SubtitleFileTypes.LocalFile) {
    const $upload = new FileManage({ root: app.assets });
    const r = await $upload.delete_subtitle(subtitle.name);
    if (r.error) {
      return e(Result.Err(r.error.message));
    }
  }
  res.status(200).json({
    code: 0,
    msg: "删除成功",
    data: null,
  });
}
