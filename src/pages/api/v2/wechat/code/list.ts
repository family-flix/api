/**
 * @file 使用游标而非分页的列表接口
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Member } from "@/domains/user/member";
import { ModelQuery } from "@/domains/store/types";
import { response_error_factory } from "@/utils/server";

export default async function v2_wechat_code_list(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { next_marker = "", page_size } = req.body as Partial<{
    next_marker: string;
    page_size: number;
  }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const where: ModelQuery<"invitation_code"> = {
    inviter_id: member.id,
  };
  const result = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.invitation_code.findMany({
        where,
        include: {
          invitee: true,
        },
        ...args,
      });
    },
    page_size,
    next_marker,
  });
  return res.status(200).json({
    code: 0,
    msg: "",
    data: result,
  });
}
