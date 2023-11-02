/**
 * @file 更新用户配置信息
 */
import dayjs from "dayjs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { push_deer_token, extra_filename_rules, ignore_rules_when_sync } = req.body as Partial<{
    push_deer_token: string;
    extra_filename_rules: string;
    ignore_rules_when_sync: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  await store.prisma.settings.update({
    where: {
      user_id: user.id,
    },
    data: {
      updated: dayjs().toISOString(),
      detail: JSON.stringify({
        ...user.settings,
        push_deer_token,
        extra_filename_rules,
        ignore_rules_when_sync,
      }),
    },
  });
  res.status(200).json({ code: 0, msg: "", data: null });
}
