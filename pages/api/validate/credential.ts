/**
 * @file 使用邮箱密码凭证进行登录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { r_id } from "@/utils";

enum AuthenticationProviders {
  Weapp = "weapp",
  EmailAndPassword = "email_and_pwd",
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { email, pwd } = req.query as Partial<{ email: string; pwd: string }>;
  const authentication = await store.prisma.member_authentication.findFirst({
    where: {
      provider: AuthenticationProviders.EmailAndPassword,
      provider_id: email,
      provider_arg1: pwd,
    },
    include: {
      member: {
        include: {
          // ...
        },
      },
    },
  });
  res.status(200).json({ code: 0, msg: "", data: null });
}
