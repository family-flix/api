/**
 * @file 获取云盘列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { AliyunDriveProfile } from "@/domains/clients/alipan/types";
import { response_error_factory } from "@/utils/server";
import { parseJSONStr } from "@/utils/index";
import { is_none } from "@/utils/primitive";

export default async function v2_admin_drive_list(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    type,
    name,
    hidden,
    next_marker,
    page_size = 20,
  } = req.body as Partial<{ type: number; name: string; hidden: number; next_marker: string; page_size: number }>;
  const t = await User.New(authorization, store);
  if (t.error) {
    return e(t);
  }
  const user = t.data;
  const where: ModelQuery<"drive"> = {
    user_id: user.id,
  };
  if (!is_none(type)) {
    where.type = type;
  }
  if (name) {
    where.name = {
      contains: name,
    };
  }
  if (!is_none(hidden)) {
    where.hidden = hidden;
  }
  const count = await store.prisma.drive.count({ where });
  const result = await store.list_with_cursor({
    fetch(extra) {
      return store.prisma.drive.findMany({
        where,
        orderBy: {
          created: "desc",
        },
        ...extra,
      });
    },
    page_size,
    next_marker,
  });
  // const { list, page, page_size, total, no_more } = r.data;
  const data = [];
  for (let i = 0; i < result.list.length; i += 1) {
    const drive = result.list[i];
    const { name, avatar, remark, total_size, used_size, root_folder_id, profile } = drive;
    const r = await parseJSONStr<AliyunDriveProfile>(profile);
    const payload: {
      id: string;
      name: string;
      avatar: string;
      total_size: number | null;
      used_size: number | null;
      root_folder_id: string | null;
      vip?: unknown;
      drive_id?: string;
    } = {
      id: drive.id,
      name: remark || name,
      avatar,
      total_size,
      used_size,
      root_folder_id,
    };
    if (r.data) {
      payload.vip = r.data.vip;
      payload.drive_id = r.data.drive_id;
    }
    data.push(payload);
  }
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page_size,
      total: count,
      next_marker: result.next_marker,
      list: data,
    },
  });
}
