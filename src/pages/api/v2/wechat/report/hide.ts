/**
 * @file 隐藏指定问题任务
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_wechat_report_hide(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const r = await store.prisma.report_v2.findFirst({
    where: {
      id,
      member_id: member.id,
    },
  });
  if (!r) {
    return e(Result.Err("没有匹配的记录"));
  }
  await store.prisma.report_v2.update({
    where: {
      id: r.id,
    },
    data: {
      hidden: 1,
      updated: dayjs().toISOString(),
    },
  });
  return res.status(200).json({ code: 0, msg: "", data: null });
}
