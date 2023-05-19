/**
 * @file 获取云盘详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { AliyunDriveClient } from "@/domains/aliyundrive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少云盘 id");
  }
  const t = await User.New(authorization);
  if (t.error) {
    return e(t);
  }
  const { id: user_id } = t.data;
  const drive = await store.prisma.drive.findFirst({
    where: {
      id,
      user_id,
    },
  });
  if (!drive) {
    return e("没有匹配的云盘记录");
  }
  const client = new AliyunDriveClient({ drive_id: id, store });
  await client.refresh_profile();
  res.status(200).json({ code: 0, msg: "", data: client.profile });
}
