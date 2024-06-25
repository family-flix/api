/**
 * @file 手动修改云盘的一些基本信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/index";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_drive_update(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    id: drive_id,
    remark,
    hidden,
    root_folder_id,
    root_folder_name,
  } = req.body as Partial<{
    id: string;
    remark: string;
    hidden: number;
    root_folder_id: string;
    root_folder_name: string;
  }>;
  const t = await User.New(authorization, store);
  if (t.error) {
    return e(t);
  }
  const user = t.data;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const payload: Partial<{ remark: string; hidden: number; root_folder_id: string; root_folder_name: string }> = {};
  if (remark) {
    payload.remark = remark;
  }
  if (hidden !== undefined) {
    payload.hidden = hidden;
  }
  if (root_folder_id && root_folder_name) {
    payload.root_folder_id = root_folder_id;
    payload.root_folder_name = root_folder_name;
  }
  if (Object.keys(payload).length === 0) {
    return e(Result.Err("没有要修改的内容"));
  }
  await store.prisma.drive.update({
    where: {
      id: drive_id,
    },
    data: payload,
  });
  return res.status(200).json({ code: 0, msg: "修改成功", data: null });
}
