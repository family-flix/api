/**
 * @file 删除云盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/v2";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_drive_delete(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { drive_id } = req.body as Partial<{ drive_id: string }>;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const t = await User.New(authorization, store);
  if (t.error) {
    return e(t);
  }
  const user = t.data;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(Result.Err(drive_res.error.message));
  }
  const drive = drive_res.data;
  const r = await store.prisma.drive.delete({
    where: {
      id: drive.id,
    },
  });
  return res.status(200).json({
    code: 0,
    msg: "删除成功",
    data: null,
  });
}
