/**
 * @file 获取云盘详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Drive } from "@/domains/drive/index";
import { User } from "@/domains/user/index";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_drive_profile(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const t = await User.New(authorization, store);
  if (t.error) {
    return e(t);
  }
  const user = t.data;
  if (!id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const drive_res = await Drive.Get({ id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const {
    profile: { name },
    client,
  } = drive;
  await client.refresh_profile();
  const { used_size, total_size } = client;
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      id,
      name,
      used_size,
      total_size,
    },
  });
}
