/**
 * @file 管理后台/电视剧详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { run_sync_task } from "@/domains/walker/run_tv_sync_task";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id || id === "undefined") {
    return e("缺少电视剧 id");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const tv = await store.prisma.tv.findFirst({
    where: {
      id,
      user_id,
    },
    include: {
      parsed_tvs: {
        include: {
          bind: true,
        },
      },
    },
  });
  if (tv === null) {
    return e("没有匹配的电视剧记录");
  }

  const { parsed_tvs } = tv;

  const tips: string[] = [];

  const binds = parsed_tvs
    .map((parsed_tv) => {
      return parsed_tv.bind;
    })
    .filter(Boolean);

  if (binds.length === 0) {
    return e("电视剧还没有同步任务");
  }

  await (async () => {
    for (let i = 0; i < parsed_tvs.length; i += 1) {
      const parsed_tv = parsed_tvs[i];
      const { bind, drive_id } = parsed_tv;
      if (!bind) {
        return;
      }
      const r = await run_sync_task(
        {
          ...bind,
          parsed_tv,
        },
        {
          store,
          user_id,
          drive_id,
        }
      );
      if (r.error) {
        tips.push(r.error.message);
        return;
      }
    }
  })();

  res.status(200).json({
    code: 0,
    msg: "",
    data: null,
  });
}
