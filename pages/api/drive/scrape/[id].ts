/**
 * @file 刮削指定文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { store } from "@/store/sqlite";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { search_tv_in_tmdb_then_update_tv } from "@/domains/walker/search_tv_in_tmdb_then_update_tv";

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
  const resp = await search_tv_in_tmdb_then_update_tv({
    drive_id,
    user_id,
    operation: store.operation,
  });
  if (resp.error) {
    return e(resp);
  }
  res.status(200).json({ code: 0, msg: "", data: resp.data });
}
