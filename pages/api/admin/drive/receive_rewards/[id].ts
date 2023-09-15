/**
 * @file 获取所有签到奖品
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id, day } = req.query as Partial<{ id: string; day: number }>;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
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
  const r = await drive.client.fetch_rewards();
  if (r.error) {
    return e(r);
  }
  const tips: string[] = [];
  for (let i = 0; i < r.data.length; i += 1) {
    await (async () => {
      const { day, rewardAmount } = r.data[i];
      const r2 = await drive.client.receive_reward(day);
      if (r2.error) {
        tips.push(`领取第 ${day} 天奖品失败 ${r2.error.message}`);
        return;
      }
      tips.push(`领取第 ${day} 天奖品 ${r2.data.name} ${rewardAmount}个 成功`);
    })();
  }
  res.status(200).json({ code: 0, msg: "", data: tips });
}
