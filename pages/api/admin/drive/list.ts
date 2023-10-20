/**
 * @file 获取云盘列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { AliyunDriveProfile } from "@/domains/aliyundrive/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { parseJSONStr } from "@/utils";
import { is_none } from "@/utils/primitive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    type,
    name,
    hidden,
    page = 1,
    page_size = 20,
  } = req.body as { type: number; name: string; hidden: number; page: number; page_size: number };
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
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
  const list = await store.prisma.drive.findMany({
    where,
    skip: (page - 1) * page_size,
    take: page_size,
    orderBy: {
      created: "desc",
    },
  });
  // const { list, page, page_size, total, no_more } = r.data;
  const data = [];
  for (let i = 0; i < list.length; i += 1) {
    const drive = list[i];
    const { name, avatar, remark, total_size, used_size, root_folder_id, profile } = drive;
    const r = await parseJSONStr<AliyunDriveProfile>(profile);
    const payload = {
      id: drive.id,
      name: remark || name,
      avatar,
      total_size,
      used_size,
      root_folder_id,
    };
    if (r.data) {
      // @ts-ignore
      payload.vip = r.data.vip;
    }
    data.push(payload);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page,
      page_size,
      total: count,
      no_more: list.length + (page - 1) * page_size >= count,
      list: data,
    },
  });
}
