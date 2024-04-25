/**
 * @file 用户详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { response_error_factory } from "@/utils/server";

export default async function v0_admin_user_profile(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const profile = store.prisma.user.findFirst({
    where: {
      id: user_id,
    },
  });
  return res.status(200).json({ code: 0, msg: "", data: profile });
}
