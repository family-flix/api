/**
 * @file 获取影片列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: episode_id } = req.query as Partial<{ id: string }>;
  if (!episode_id) {
    return e("Missing episode id");
  }
  const t_resp = await User.New(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { all } = store.operation;
  const resp = await all(`SELECT id,episode,file_id,file_name,tv_id
	FROM episode
	WHERE tv_id = (SELECT tv_id FROM episode WHERE id = '${episode_id}')
	AND season_id = (SELECT season_id FROM episode WHERE id = '${episode_id}') ORDER BY episode ASC`);
  if (resp.error) {
    return e(resp);
  }
  res.status(200).json({ code: 0, msg: "", data: resp.data });
}
