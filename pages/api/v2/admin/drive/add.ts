/**
 * @file 添加云盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Drive } from "@/domains/drive/v2";
import { Administrator } from "@/domains/administrator";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { type, payload } = req.body as { type: number; payload: unknown };
  const t_res = await Administrator.New(authorization, store);
  if (t_res.error) {
    return e(t_res.error);
  }
  const user = t_res.data;
  if (!type) {
    return e(Result.Err("请指定云盘类型"));
  }
  if (!payload) {
    return e(Result.Err("请传入云盘信息"));
  }
  const r = await Drive.Create({ type, payload, store, user });
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  user.update_stats({
    drive_count: user.statistics.drive_count + 1,
    //     drive_total_size_count: user.statistics.drive_total_size_count + r.data.profile.total_size,
    //     drive_used_size_count: user.statistics.drive_used_size_count + r.data.profile.used_size,
  });
  res.status(200).json({
    code: 0,
    msg: "新增云盘成功",
    data: null,
  });
}
