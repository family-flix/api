/**
 * @file 获取所有签到奖品
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { User } from "@/domains/user";
import { store } from "@/store";
import { AliyunDriveClient } from "@/domains/aliyundrive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, day } = req.query as Partial<{ id: string; day: number }>;
  if (!id) {
    return e("缺少云盘 id");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const drive = await store.prisma.drive.findFirst({
    where: {
      id,
      user_id,
    },
  });
  if (!drive) {
    return e("没有匹配的云盘记录");
  }
  const { id: drive_id } = drive;
  const client = new AliyunDriveClient({ drive_id, store });
  if (day !== undefined) {
    const r = await client.receive_reward(day);
    if (r.error) {
      return e(r);
    }
    return res.status(200).json({ code: 0, msg: `领取 ${r.data.name} 成功`, data: r.data });
  }
  const r = await client.fetch_rewards();
  if (r.error) {
    return e(r);
  }
  const tips: string[] = [];
  for (let i = 0; i < r.data.length; i += 1) {
    await (async () => {
      const { day, rewardAmount } = r.data[i];
      const r2 = await client.receive_reward(day);
      if (r2.error) {
        tips.push(`领取第 ${day} 天奖品失败 ${r2.error.message}`);
        return;
      }
      tips.push(`领取第 ${day} 天奖品 ${r2.data.name} ${rewardAmount}个 成功`);
    })();
  }
  res.status(200).json({ code: 0, msg: "", data: tips });
}
