/**
 * @file 获取成员权限
 */
import dayjs from "dayjs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { parseJSONStr } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { member_id } = req.query as Partial<{ member_id: string }>;
  const { permissions } = req.body as Partial<{ member_id: string; permissions: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!member_id) {
    return e(Result.Err("缺少成员 id"));
  }
  if (!permissions) {
    return e(Result.Err("缺少权限信息"));
  }
  const member = await store.prisma.member.findFirst({
    where: {
      id: member_id,
      user_id: user.id,
    },
  });
  if (!member) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { permission } = member;
  const json_res = await parseJSONStr(permission);
  if (json_res.error) {
    return e(json_res);
  }
  res.status(200).json({ code: 0, msg: "", data: json_res.data });
}
