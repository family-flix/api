/**
 * @file 执行一次同步任务
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { User } from "@/domains/user";
import { run_sync_task } from "@/domains/walker/run_tv_sync_task";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少同步任务 id");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const task = await store.prisma.bind_for_parsed_tv.findFirst({
    where: {
      id,
      parsed_tv: {
        file_id: {
          not: null,
        },
      },
      user_id,
    },
    include: {
      parsed_tv: true,
    },
  });
  if (task === null) {
    return e("没有匹配的同步任务记录");
  }
  const { parsed_tv } = task;
  const r = await run_sync_task(task, {
    store,
    drive_id: parsed_tv.drive_id,
    user_id,
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: r.data });
}
