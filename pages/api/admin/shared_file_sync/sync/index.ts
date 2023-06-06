/**
 * @file 执行所有资源同步任务
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { User } from "@/domains/user";
import { store } from "@/store";
import { ResourceSyncTask } from "@/domains/resource_sync_task";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id, settings } = user;
  let page = 1;
  let no_more = false;
  const page_size = 20;

  (async () => {
    do {
      const tasks = await store.prisma.bind_for_parsed_tv.findMany({
        where: {
          in_production: 1,
          invalid: 0,
          user_id,
        },
        include: {
          parsed_tv: true,
        },
        skip: (page - 1) * page_size,
        take: page_size,
      });
      page += 1;
      no_more = tasks.length === 0;
      for (let i = 0; i < tasks.length; i += 1) {
        const task = tasks[i];
        const { url, file_id, name, parsed_tv_id, parsed_tv } = task;
        const { drive_id } = parsed_tv;
        // const task_res = await ResourceSyncTask.Get({
        //   id,
        //   user,
        //   drive,
        //   client,
        //   store,
        //   TMDB_TOKEN: settings.tmdb_token,
        //   assets: settings.assets,
        // });
        // await run_sync_task(
        //   {
        //     ...task,
        //     parsed_tv,
        //   },
        //   {
        //     wait_complete: true,
        //     store,
        //     drive_id,
        //     user_id,
        //   }
        // );
      }
    } while (no_more === false);
  })();

  res.status(200).json({ code: 0, msg: "", data: null });
}
