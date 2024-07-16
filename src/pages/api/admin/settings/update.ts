/**
 * @file 更新用户配置信息
 */
import dayjs from "dayjs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User, UserSettings } from "@/domains/user";
import { response_error_factory } from "@/utils/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    tmdb_token,
    push_deer_token,
    telegram_token,
    third_douban,
    extra_filename_rules,
    ignore_files_when_sync,
    max_size_when_sync,
  } = req.body as Partial<UserSettings>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  console.log("[API]admin/settings - before settings.update", user.settings, req.body);
  await store.prisma.settings.update({
    where: {
      user_id: user.id,
    },
    data: {
      updated: dayjs().toISOString(),
      detail: JSON.stringify({
        ...user.settings,
        tmdb_token,
        third_douban,
        telegram_token,
        push_deer_token,
        extra_filename_rules,
        ignore_files_when_sync,
        max_size_when_sync,
      }),
    },
  });
  res.status(200).json({ code: 0, msg: "", data: null });
}
