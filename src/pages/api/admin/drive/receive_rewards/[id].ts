/**
 * @file 管理后台/领取所有签到奖品
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store";
import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { Job, TaskTypes } from "@/domains/job";
import { ArticleLineNode, ArticleTextNode } from "@/domains/article";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id, day } = req.body as Partial<{ id: string; day: number }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  if (day !== undefined) {
    const r = await drive.client.receive_reward(day);
    if (r.error) {
      return e(r);
    }
    return res.status(200).json({ code: 0, msg: `领取 ${r.data.name} 成功`, data: r.data });
  }
  const job_res = await Job.New({
    unique_id: drive_id,
    desc: `领取「${drive.profile.name}」签到奖励`,
    type: TaskTypes.ReceiveSignInRewards,
    user_id: user.id,
    app,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  async function run() {
    const r = await drive.client.fetch_rewards();
    if (r.error) {
      job.output.write(
        new ArticleLineNode({
          children: ["获取奖励失败，因为", r.error.message].map((text) => new ArticleTextNode({ text })),
        })
      );
      job.finish();
      return;
    }
    for (let i = 0; i < r.data.length; i += 1) {
      await (async () => {
        const { day, rewardAmount } = r.data[i];
        job.output.write(
          new ArticleLineNode({
            children: [`领取第 ${day} 天奖励`].map((text) => new ArticleTextNode({ text })),
          })
        );
        const r2 = await drive.client.receive_reward(day);
        if (r2.error) {
          job.output.write(
            new ArticleLineNode({
              children: [`领取第 ${day} 天奖励失败，因为`, r2.error.message].map(
                (text) => new ArticleTextNode({ text })
              ),
            })
          );
          return;
        }
        job.output.write(
          new ArticleLineNode({
            children: [`领取第 ${day} 天奖励`, r2.data.name, `${rewardAmount}个`, "成功"].map(
              (text) => new ArticleTextNode({ text })
            ),
          })
        );
      })();
    }
    job.output.write(
      new ArticleLineNode({
        children: [`完成奖励领取`].map((text) => new ArticleTextNode({ text })),
      })
    );
    job.finish();
  }
  run();
  res.status(200).json({
    code: 0,
    msg: "开始领取",
    data: {
      job_id: job.id,
    },
  });
}
