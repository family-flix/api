/**
 * @file 获取 邀请的成员 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { MemberWhereInput } from "@/domains/store/types";
import { response_error_factory } from "@/utils/server";
import { to_number } from "@/utils/primitive";

export default async function v0_wechat_invitee_list(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    remark,
    page: page_str,
    page_size: page_size_str,
  } = req.body as Partial<{
    remark: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
  let queries: MemberWhereInput[] = [];
  if (remark) {
    queries = queries.concat({
      OR: [
        {
          remark: {
            contains: remark,
          },
        },
      ],
    });
  }
  const where: MemberWhereInput = {
    inviter: {
      id: member.id,
    },
  };
  if (queries.length !== 0) {
    where.AND = queries;
  }
  const count = await store.prisma.member.count({
    where,
  });
  const list = await store.prisma.member.findMany({
    where,
    include: {
      tokens: true,
    },
    orderBy: {
      created: "desc",
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    page,
    page_size,
    no_more: list.length + (page - 1) * page_size >= count,
    list: list.map((member) => {
      const { id, remark, tokens, created } = member;
      return {
        id,
        remark,
        tokens: tokens.map((token) => {
          const { id, used } = token;
          return {
            id,
            token: id,
            used,
          };
        }),
        created,
      };
    }),
  };
  return res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
