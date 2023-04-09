/**
 * @file 合并同一部影视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { merge_same_tv_and_episodes } from "@/domains/walker/merge_same_tv_and_episode";
import { hidden_empty_tv } from "@/domains/walker/clean_empty_records";
import { store } from "@/store/sqlite";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id } = req.query as Partial<{
    id: string;
  }>;
  if (!drive_id) {
    return e("Missing aliyun_drive_id");
  }
  const t_resp = parse_token(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const r1 = await merge_same_tv_and_episodes(
    {
      user_id,
      drive_id,
    },
    store.operation
  );
  if (r1.error) {
    return e(r1);
  }
  const r2 = await hidden_empty_tv({ user_id, drive_id }, store.operation);
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
