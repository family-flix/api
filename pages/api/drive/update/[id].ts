/**
 * @file 删除播放记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { store } from "@/store/sqlite";
import { AliyunDriveRecord } from "@/store/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const body = req.body as Partial<AliyunDriveRecord>;
  if (!id) {
    return e("Missing drive id");
  }
  const t_resp = parse_token(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const r = await store.find_aliyun_drive({ id, user_id });
  if (r.error) {
    return e(r);
  }
  if (!r.data) {
    return e("No matched record of drive");
  }
  // 这有这两个字段可以运行用户修改，其他值只能从阿里云盘同步
  const { name, root_folder_id } = body;
  const r2 = await store.update_aliyun_drive(id, { name, root_folder_id });
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({ code: 0, msg: "", data: { id: r2.data.id } });
}
