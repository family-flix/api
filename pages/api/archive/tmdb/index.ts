/**
 * @file 整理归档指定文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { search_tv_in_tmdb_then_update_tv } from "@/domains/walker/search_tv_in_tmdb_then_update_tv";
import { merge_same_tv_and_episodes } from "@/domains/walker/merge_same_tv_and_episode";
import { hidden_empty_tv } from "@/domains/walker/clean_empty_records";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { aliyun_drive_id } = req.query as Partial<{
    aliyun_drive_id: string;
  }>;
  if (!aliyun_drive_id) {
    return e("Missing aliyun_drive_id");
  }
  const { authorization } = req.headers;
  const t_resp = await User.New(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const r1 = await search_tv_in_tmdb_then_update_tv({
    user_id,
    drive_id: aliyun_drive_id,
    store,
  });
  if (r1.error) {
    return e(r1);
  }
  const r2 = await merge_same_tv_and_episodes(
    {
      user_id,
      drive_id: aliyun_drive_id,
    },
    store
  );
  if (r2.error) {
    return e(r2);
  }
  const r3 = await hidden_empty_tv(
    {
      user_id: t_resp.data.id,
      drive_id: aliyun_drive_id,
    },
    store
  );
  if (r3.error) {
    return e(r3.error);
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
