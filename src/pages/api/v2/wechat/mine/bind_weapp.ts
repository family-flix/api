/**
 * @file 将指定用户关联到指定的小程序账号
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { AuthenticationProviders } from "@/constants/index";

export default async function v2_wechat_mine_bind_weapp(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { member_id } = req.body as Partial<{
    member_id: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const me = t_res.data;
  const member = await store.prisma.member.findFirst({
    where: {
      id: member_id,
    },
  });
  if (!member) {
    return e(Result.Err("目标用户不存在"));
  }
  const account = await store.prisma.member_authentication.findFirst({
    where: {
      provider: AuthenticationProviders.Weapp,
      member_id: me.id,
    },
  });
  if (!account) {
    return e(Result.Err("暂没有小程序账号"));
  }
  await store.prisma.member_authentication.update({
    where: {
      id: account.id,
    },
    data: {
      member_id: member.id,
    },
  });
  return res.status(200).json({
    code: 0,
    msg: "修改成功",
    data: null,
  });
}
