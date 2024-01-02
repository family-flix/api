/**
 * @file 添加云盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Drive } from "@/domains/drive";
import { DriveTypes } from "@/domains/drive/constants";
import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { type = DriveTypes.AliyunBackupDrive, payload } = req.body as { type: number; payload: unknown };
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res.error);
  }
  const user = t_res.data;
  if (!payload) {
    return e(Result.Err("请传入云盘信息"));
  }
  const r = await Drive.Add({ type, payload, user, store });
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  res.status(200).json({
    code: 0,
    msg: "新增云盘成功",
    data: null,
  });
}
