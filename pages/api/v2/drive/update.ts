/**
 * @file 更新云盘信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive/v2";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { drive_id, payload } = req.body as Partial<{
    drive_id: string;
    payload: Partial<{
      root_folder_id: string;
      root_folder_name: string;
      refresh_token: string;
      name: string;
      remark: string;
    }>;
  }>;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  if (!payload) {
    return e(Result.Err("缺少更新数据"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(Result.Err(drive_res.error.message));
  }
  const drive = drive_res.data;
  const { root_folder_id, root_folder_name } = payload;
  await store.prisma.drive.update({
    where: {
      id: drive.id,
    },
    data: {
      root_folder_id,
      root_folder_name,
    },
  });
  res.status(200).json({ code: 0, msg: "设置索引目录成功", data: null });
}
