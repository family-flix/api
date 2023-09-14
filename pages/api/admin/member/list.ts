/**
 * @file 获取指定用户的成员
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { to_number } from "@/utils/primitive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    page: page_str,
    page_size: page_size_str,
  } = req.query as Partial<{
    name: string;
    page: string;
    page_size: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
  const where: ModelQuery<"member"> = {
    user_id,
    delete: 0,
  };
  if (name) {
    where.remark = {
      contains: name,
    };
  }
  const count = await store.prisma.member.count({ where });
  const list = await store.prisma.member.findMany({
    where,
    include: {
      member_tokens: {
        select: {
          id: true,
          token: true,
        },
      },
      inviter: true,
    },
    orderBy: {
      created: "desc",
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      list: list.map((member) => {
        const { id, inviter, remark, member_tokens } = member;
        return {
          id,
          remark,
          inviter: inviter
            ? {
                id: inviter.id,
                remark: inviter.remark,
              }
            : null,
          tokens: member_tokens,
        };
      }),
      total: count,
      page,
      page_size,
      no_more: list.length + (page - 1) * page_size >= count,
    },
  });
}
