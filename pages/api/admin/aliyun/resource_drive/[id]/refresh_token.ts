/**
 * @file 递归地获取指定文件夹所有子文件&子文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { AliyunResourceClient } from "@/domains/aliyundrive/resource";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id } = req.query as Partial<{
    id: string;
  }>;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id 参数"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const client_res = await AliyunResourceClient.Get({ drive_id, store });
  if (client_res.error) {
    return e(client_res);
  }
  const client = client_res.data;
  const r = await client.refresh_access_token();
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: r.data });
}
