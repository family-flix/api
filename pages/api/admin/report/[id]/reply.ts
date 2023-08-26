/**
 * @file 回复问题反馈
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const { msg } = req.body as Partial<{ msg: string }>;
  if (!id) {
    return e(Result.Err("缺少问题 id"));
  }
  if (!msg) {
    return e(Result.Err("缺少回复内容"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const report = await store.prisma.report.findFirst({
    where: {
      id,
      user_id: user.id,
    },
  });
  if (!report) {
    return e(Result.Err("没有匹配的记录"));
  }
  await store.prisma.report.update({
    where: {
      id: report.id,
    },
    data: {
      updated: dayjs().toISOString(),
      answer: msg,
    },
  });
  res.status(200).json({ code: 0, msg: "", data: null });
}
