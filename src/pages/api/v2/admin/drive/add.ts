/**
 * @file 添加云盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Drive } from "@/domains/drive/v2";
import { Administrator } from "@/domains/administrator";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_drive_add(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { type, payload } = req.body as Partial<{ type: number; payload: unknown }>;
  const t = await Administrator.New(authorization, store);
  if (t.error) {
    return e(t);
  }
  const user = t.data;
  if (type === undefined) {
    return e(Result.Err("请指定云盘类型"));
  }
  if (!payload) {
    return e(Result.Err("请传入云盘信息"));
  }
  const r = await Drive.Create({ type, payload, store, user });
  if (r.error) {
    return e(r);
  }
  user.update_stats({
    drive_count: user.statistics.drive_count + 1,
    //     drive_total_size_count: user.statistics.drive_total_size_count + r.data.profile.total_size,
    //     drive_used_size_count: user.statistics.drive_used_size_count + r.data.profile.used_size,
  });
  return res.status(200).json({
    code: 0,
    msg: "新增云盘成功",
    data: null,
  });
}
