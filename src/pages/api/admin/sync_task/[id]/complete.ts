/**
 * @file 管理后台/标志同步任务已完结
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少同步任务 id"));
  }
  const task = await store.prisma.bind_for_parsed_tv.findFirst({
    where: {
      id,
      user_id: user.id,
    },
  });
  if (!task) {
    return e(Result.Err("没有匹配的记录"));
  }
  await store.prisma.bind_for_parsed_tv.update({
    where: {
      id: task.id,
    },
    data: {
      updated: dayjs().toISOString(),
      in_production: 0,
    },
  });
  res.status(200).json({ code: 0, msg: "更新成功", data: {} });
}
