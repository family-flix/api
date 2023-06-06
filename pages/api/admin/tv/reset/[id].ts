/**
 * @file 管理后台/执行指定电视剧同步任务
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
import { Drive } from "@/domains/drive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id || id === "undefined") {
    return e("缺少电视剧 id");
  }

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id, settings } = user;
  const token = settings.tmdb_token;
  if (!token) {
    return e("缺少 TMDB_TOKEN");
  }
  const tv = await store.prisma.tv.findFirst({
    where: {
      id,
      user_id,
    },
    include: {
      profile: true,
      parsed_tvs: {
        include: {
          binds: true,
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
      return parsed_tv.binds;
    })
    .reduce((total, cur) => {
      return total.concat(cur);
    })
    .filter(Boolean);
  if (binds.length === 0) {
    return e("电视剧还没有更新任务");
  }
  const job_res = await Job.New({
    desc: `更新电视剧 '${name || original_name}'`,
    unique_id: id,
    user_id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  for (let i = 0; i < parsed_tvs.length; i += 1) {
    await (async () => {
      const parsed_tv = parsed_tvs[i];
      const { binds, drive_id } = parsed_tv;
      if (!binds) {
        job.finish();
        return;
      }
      const drive_res = await Drive.Get({ id: drive_id, user_id, store });
      if (drive_res.error) {
        job.finish();
        return;
      }
      const valid_bind = binds.find((b) => !b.invalid);
      if (!valid_bind) {
        job.finish();
        return;
      }
      const drive = drive_res.data;
      const t = new ResourceSyncTask({
        task: {
          ...valid_bind,
          parsed_tv,
        },
        user,
        drive,
        client: drive.client,
        store,
        TMDB_TOKEN: token,
        on_print(v) {
          job.output.write(v);
        },
        on_finish() {
          job.output.write(
            new ArticleLineNode({
              children: [
                new ArticleTextNode({
                  text: `电视剧 '${name || original_name}' 更新完成`,
                }),
              ],
            })
          );
          job.finish();
        },
        on_error(error) {
          job.throw(error);
        },
      });
      await t.run();
    })();
  }

  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      job_id: job.id,
    },
  });
}
