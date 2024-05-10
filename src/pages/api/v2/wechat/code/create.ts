/**
 * @file 创建邀请码
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { ModelQuery } from "@/domains/store/types";
import { response_error_factory } from "@/utils/server";
import { r_id } from "@/utils/index";

export default async function v2_wechat_code_create(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { count = 1 } = req.body as Partial<{
    count: number;
  }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const codes = [];
  for (let i = 0; i < count; i += 1) {
    const code = r_id();
    const created = await store.prisma.invitation_code.create({
      data: {
        id: code,
        text: code,
        used: 0,
        inviter_id: member.id,
      },
    });
    codes.push({
      code,
      created_at: created.created,
    });
  }
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      list: codes,
    },
  });
}
