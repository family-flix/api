/**
 * @file 刷新 access_token
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store } from "@/store";
import { User } from "@/domains/user";
import { Result } from "@/domains/result/index";
import { AliyunDriveClient } from "@/domains/clients/alipan";
import { response_error_factory } from "@/utils/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse<unknown>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { unique_id } = req.body as Partial<{
    unique_id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!unique_id) {
    return e(Result.Err("缺少云盘 unique_id 参数"));
  }
  const r = await AliyunDriveClient.Get({ unique_id, user });
  if (r.error) {
    return e(r);
  }
  const client = r.data;
  const r2 = await client.refresh_access_token();
  if (r2.error) {
    return e(r);
  }
  return res.status(200).json({
    code: 0,
    msg: "",
    data: r.data,
  });
}
