/**
 * @file 消息置为已读
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  if (!id) {
    return e(Result.Err("缺少消息 id"));
  }
  const notification = await store.prisma.member_notification.findFirst({
    where: {
      id,
      member_id: member.id,
    },
  });
  if (!notification) {
    return e(Result.Err("没有匹配的记录"));
  }
  await store.prisma.member_notification.update({
    where: {
      id: notification.id,
    },
    data: {
      status: 2,
    },
  });
  res.status(200).json({ code: 0, msg: "", data: null });
}
