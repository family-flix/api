/**
 * @file 管理后台/关联一个季
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { ResourceSyncTask } from "@/domains/resource_sync_task";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, season_id } = req.body as Partial<{ id: string; season_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少同步任务 id"));
  }
  const task_res = await ResourceSyncTask.Get({
    id,
    user,
    store,
    assets: app.assets,
  });
  if (task_res.error) {
    return e(task_res);
  }
  const task = task_res.data;
  const season = await store.prisma.season.findFirst({
    where: {
      id: season_id,
      user_id: user.id,
    },
  });
  if (!season) {
    return e(Result.Err("没有匹配的季"));
  }
  await store.prisma.bind_for_parsed_tv.update({
    where: {
      id: task.profile.id,
    },
    data: {
      updated: dayjs().toISOString(),
      season_id,
    },
  });
  res.status(200).json({ code: 0, msg: "更新成功", data: {} });
}
