/**
 * @file 新增或更新影片播放记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { Member } from "@/domains/user/member";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    tv_id,
    episode_id,
    current_time = 0,
    duration = 0,
  } = req.body as Partial<{
    tv_id: string;
    episode_id: string;
    current_time: number;
    duration: number;
  }>;
  if (!tv_id) {
    return e("缺少电视剧 id");
  }
  if (!episode_id) {
    return e("缺少影片 id");
  }
  const t_res = await Member.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: member_id } = t_res.data;
  const existing_history_res = await store.find_history({
    tv_id,
    // 这里不能传 episode_id，当前是 E01，更新成 E02 时，用 E02 去找就有问题
    // episode_id,
    member_id,
  });
  if (existing_history_res.error) {
    return e(existing_history_res);
  }
  if (!existing_history_res.data) {
    const adding_res = await store.add_history({
      tv_id,
      episode_id,
      current_time,
      duration,
      member_id,
    });
    if (adding_res.error) {
      return e(adding_res);
    }
    return res.status(200).json({
      code: 0,
      msg: "",
      data: null,
    });
  }
  const update_res = await store.update_history(existing_history_res.data.id, {
    episode_id,
    current_time,
    duration,
  });
  if (update_res.error) {
    return e(update_res);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: null,
  });
}
