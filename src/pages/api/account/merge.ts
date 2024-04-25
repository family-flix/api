/**
 * @file 关联两个账户
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v0_account_merge(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { token: token_id } = req.body as Partial<{ token: string }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!token_id) {
    return e(Result.Err("缺少要关联的账户信息"));
  }
  const member = t_res.data;
  const the_account = await store.prisma.member.findFirst({
    where: {
      tokens: {
        some: {
          id: token_id,
        },
      },
    },
  });
  if (!the_account) {
    return e(Result.Err("没有匹配的账户信息"));
  }
  if (member.id === the_account.id) {
    return e(Result.Err("关联账户和当前账户相同"));
  }
  return res.status(200).json({ code: 0, msg: "", data: null });
}
