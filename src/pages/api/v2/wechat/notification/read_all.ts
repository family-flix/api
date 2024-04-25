/**
 * @file 所有消息置为已读
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { response_error_factory } from "@/utils/server";

export default async function v2_wechat_notification_read_all(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  await store.prisma.member_notification.updateMany({
    where: {
      member_id: member.id,
    },
    data: {
      status: 2,
    },
  });
  return res.status(200).json({ code: 0, msg: "", data: null });
}
