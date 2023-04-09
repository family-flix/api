/**
 * @file 删除播放记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { store } from "@/store/sqlite";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少网盘 id 参数");
  }
  const t_res = parse_token(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const drive_res = await store.find_aliyun_drive({ id, user_id });
  if (drive_res.error) {
    return e(drive_res);
  }
  if (!drive_res.data) {
    return e("No matched record of drive");
  }
  res.status(200).json({ code: 0, msg: "", data: drive_res.data });
}
