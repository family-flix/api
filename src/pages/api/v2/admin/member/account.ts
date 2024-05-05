/**
 * @file 获取指定成员的所有账户
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { ModelQuery } from "@/domains/store/types";
import { response_error_factory } from "@/utils/server";
import { AuthenticationProviders } from "@/constants/index";
import { Result } from "@/types/index";

export default async function v2_admin_member_list(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{
    id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少 id 参数"));
  }
  const where: ModelQuery<"member"> = {
    id,
    user_id: user.id,
    delete: 0,
  };
  const r = await store.prisma.member.findFirst({
    where,
    include: {
      authentications: true,
    },
  });
  if (!r) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { remark, authentications } = r;
  //   const data = {
  //     id,
  //     remark,
  //     accounts: authentications.map((account) => {
  //       const { provider, provider_id, provider_arg1 } = account;
  //       return {
  //         provider,
  //         provider_id,
  //         provider_arg1,
  //       };
  //     }),
  //   };
  const data = authentications.map((account) => {
    const { provider, provider_id, provider_arg1 } = account;
    return {
      provider,
      provider_id,
      provider_arg1,
    };
  });
  return res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
