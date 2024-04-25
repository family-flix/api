/**
 * @file 管理后台/删除同步任务
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_sync_task_delete(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
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
  const task = await store.prisma.resource_sync_task.findFirst({
    where: {
      id,
      user_id: user.id,
    },
  });
  if (!task) {
    return e(Result.Err("没有匹配的记录"));
  }
  await store.prisma.resource_sync_task.delete({
    where: {
      id: task.id,
    },
  });
  return res.status(200).json({ code: 0, msg: "删除成功", data: null });
}
