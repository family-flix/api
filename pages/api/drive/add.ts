/**
 * @file 添加阿里云盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { User } from "@/domains/user";
import { AliyunDrivePayload } from "@/domains/aliyundrive/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t = await User.New(authorization);
  if (t.error) {
    return e(t.error);
  }
  const user = t.data;
  const { payload } = req.body as { payload: AliyunDrivePayload };
  const r = await user.add_drive({ payload });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: r.data,
  });
}
