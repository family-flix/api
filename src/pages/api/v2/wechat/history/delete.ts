/**
 * @file 删除播放记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store";
import { MediaThumbnail } from "@/domains/media_thumbnail/index";
import { Member } from "@/domains/user/member";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_wechat_history_delete(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res.error.message);
  }
  if (!id) {
    return e(Result.Err("缺少播放记录 id"));
  }
  const member = t_res.data;
  const history = await store.prisma.play_history_v2.findFirst({
    where: {
      id,
      member_id: member.id,
    },
  });
  if (!history) {
    return e(Result.Err("没有匹配的播放记录"));
  }
  const thumbnail = await MediaThumbnail.New({
    assets: app.assets,
  });
  if (thumbnail.error) {
    return Result.Err(thumbnail.error.message);
  }
  const $thumbnail = thumbnail.data;
  if (history.thumbnail_path) {
    $thumbnail.delete_snapshot(history.thumbnail_path);
  }
  await store.prisma.play_history_v2.delete({
    where: {
      id: history.id,
    },
  });
  return res.status(200).json({ code: 0, msg: "删除成功", data: null });
}
