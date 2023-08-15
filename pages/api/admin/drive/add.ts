/**
 * @file 添加云盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Drive } from "@/domains/drive";
import { User } from "@/domains/user";
import { AliyunDrivePayload } from "@/domains/aliyundrive/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { payload } = req.body as { payload: AliyunDrivePayload };
  if (!payload) {
    return e("请传入云盘信息");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res.error);
  }
  const { id: user_id } = t_res.data;
  const r = await Drive.Add({ payload, user_id }, store);
  if (r.error) {
    return e(r);
  }
  res.status(200).json({
    code: 0,
    msg: "新增云盘成功",
    data: null,
  });
}
