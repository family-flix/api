/**
 * @file 刷新所有用户的 token
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  //   const { id } = req.query as Partial<{ id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const members = await store.prisma.member.findMany({
    where: {
      user_id: user.id,
    },
  });
  for (let i = 0; i < members.length; i += 1) {
    await (async () => {
      const member = members[i];
      const token_res = await User.Token({ id: member.id });
      if (token_res.error) {
        return;
      }
      const token = token_res.data;
      await store.prisma.member_token.updateMany({
        where: {
          member_id: member.id,
        },
        data: {
          token,
        },
      });
    })();
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
