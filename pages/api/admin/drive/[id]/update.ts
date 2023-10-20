/**
 * @file 更新指定云盘信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { DriveUpdateInput, DriveWhereInput } from "@/domains/store/types";
import { is_none } from "@/utils/primitive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id } = req.query as Partial<{ id: string }>;
  const { root_folder_id, root_folder_name, hidden, remark } = req.body as Partial<{
    root_folder_id: string;
    root_folder_name: string;
    hidden: number;
    remark: string;
  }>;
  const t = await User.New(authorization, store);
  if (t.error) {
    return e(t.error);
  }
  if (!drive_id) {
    return e("缺少云盘 id");
  }
  const user = t.data;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const payload: DriveUpdateInput = {};
  if (root_folder_id && root_folder_name) {
    payload.root_folder_id = root_folder_id;
    payload.root_folder_name = root_folder_name;
  }
  if (remark) {
    payload.remark = remark;
  }
  if (!is_none(hidden)) {
    payload.hidden = hidden;
  }
  await store.prisma.drive.update({
    where: {
      id: drive.id,
    },
    data: payload,
  });
  res.status(200).json({ code: 0, msg: "", data: null });
}
