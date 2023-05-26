/**
 * @file 管理后台/电视剧详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { ResourceSyncTask } from "@/domains/resource_sync_task";
import { Job } from "@/domains/job";
import { ArticleLineNode, ArticleTextNode } from "@/domains/article";

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
      profile: true,
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
  const {
    profile: { name, original_name },
    parsed_tvs,
  } = tv;
  const binds = parsed_tvs
    .map((parsed_tv) => {
      return parsed_tv.bind;
    })
    .filter(Boolean);
  if (binds.length === 0) {
    return e("电视剧还没有同步任务");
  }
  const job_res = await Job.New({
    desc: `开始同步电视剧 '${name || original_name}' 新增剧集`,
    unique_id: id,
    user_id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }

  const job = job_res.data;

  (async () => {
    for (let i = 0; i < parsed_tvs.length; i += 1) {
      const parsed_tv = parsed_tvs[i];
      const { bind, drive_id } = parsed_tv;
      if (!bind) {
        return;
      }
      const t = new ResourceSyncTask({
        task: {
          ...bind,
          parsed_tv,
        },
        job,
        user_id,
        drive_id,
        store,
      });
      await t.run();
      job.output.write(
        new ArticleLineNode({
          children: [
            new ArticleTextNode({
              text: `电视剧 '${name || original_name}' 新增资源同步完成`,
            }),
          ],
        })
      );
      await job.finish();
    }
  })();

  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      job_id: job.id,
    },
  });
}
