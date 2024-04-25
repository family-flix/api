/**
 * @file 获取用户配置信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { response_error_factory } from "@/utils/server";

export default async function v0_admin_settings_index(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { push_deer_token, ignore_files_when_sync, max_size_when_sync, extra_filename_rules } = user.settings;
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      push_deer_token,
      ignore_files_when_sync,
      max_size_when_sync,
      extra_filename_rules,
    },
  });
}
