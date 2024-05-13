/**
 * @file 用户注册
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { User } from "@/domains/user";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_wechat_auth_register(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    email,
    pwd: password,
    code,
  } = req.body as Partial<{
    email: string;
    pwd: string;
    code: string;
  }>;
  const administrator = await store.prisma.user.findFirst({
    include: {
      settings: true,
    },
  });
  if (!administrator) {
    return e(Result.Err("系统异常"));
  }
  const settings = await User.ParseSettings(administrator.settings);
  if (!settings.can_register) {
    return e(Result.Err("暂未开放注册"));
  }
  if (!settings.no_need_invitation_code && !code) {
    return e(Result.Err("请输入邀请码"));
  }
  const r = await Member.Create({ email, password, code, user_id: administrator.id }, store);
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const { id, token } = r.data;
  return res.status(200).json({
    code: 0,
    msg: "注册成功",
    data: {
      id,
      email,
      token,
    },
  });
}
