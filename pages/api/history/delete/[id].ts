/**
 * @file 删除播放记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { TV } from "@/domains/tv";
import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少播放记录 id");
  }
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: member_id } = t_res.data;

  const history_res = await store.find_history({ id, member_id });
  if (history_res.error) {
    return e(history_res);
  }
  const history = history_res.data;
  if (!history) {
    return e("没有匹配的播放记录");
  }
  if (history.thumbnail) {
    const tv_res = await TV.New({
      assets: app.assets,
    });
    if (tv_res.data) {
      const tv = tv_res.data;
      tv.delete_snapshot(history.thumbnail);
    }
  }
  const r = await store.delete_history({
    id,
    member_id,
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "删除成功", data: null });
}
