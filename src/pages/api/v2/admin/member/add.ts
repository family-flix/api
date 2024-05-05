/**
 * @file 新增成员
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { Member } from "@/domains/user/member";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { random_string, r_id } from "@/utils/index";
import { AuthenticationProviders } from "@/constants/index";

export default async function v2_admin_member_add(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { remark, name, email } = req.body as Partial<{
    name: string;
    email: string;
    remark: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!remark) {
    return e(Result.Err("缺少成员备注"));
  }
  const existing_member = await store.prisma.member.findUnique({
    where: {
      user_id_inviter_id_remark: {
        remark,
        inviter_id: "",
        user_id: user.id,
      },
    },
  });
  if (existing_member) {
    return e(Result.Err("已存在相同备注的成员了"));
  }
  const unique_id = random_string(6);
  const pwd = random_string(8);
  console.log("create member", remark, unique_id, pwd);
  const r2 = await Member.Create(
    { email: `${unique_id}@funzm.com`, password: pwd, no_email: true, remark, user_id: user.id },
    store
  );
  if (r2.error) {
    return e(r2);
  }
  // const r2 = await store.prisma.member_authentication.create({
  //   data: {
  //     id: r_id(),
  //     provider: AuthenticationProviders.Credential,
  //     provider_id: unique_id,
  //     provider_arg1: ,
  //     member: {
  //       create: {
  //         id: r_id(),
  //         remark,
  //         name: unique_id,
  //         email: null,
  //         disabled: 0,
  //         user_id: user.id,
  //       },
  //     },
  //   },
  // });
  // const token_res = await User.Token({ id: r.id });
  // if (token_res.error) {
  //   return e(token_res);
  // }
  // const token = token_res.data;
  // const r2 = await store.prisma.member_token.create({
  //   data: {
  //     id: r_id(),
  //     member_id: r.id,
  //     token,
  //     used: 0,
  //   },
  // });
  // const member = {
  //   id: r.id,
  //   remark: r.remark,
  //   tokens: [
  //     {
  //       id: r2.id,
  //       token: r2.token,
  //       used: r2.used,
  //     },
  //   ],
  // };
  const member = {
    id: r2.data.id,
    account: {
      id: `${unique_id}@funzm.com`,
      pwd,
    },
  };
  return res.status(200).json({ code: 0, msg: "添加成员成功", data: member });
}
