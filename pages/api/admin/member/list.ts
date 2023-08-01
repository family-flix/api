/**
 * @file 获取指定用户的成员
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    page: page_str = "1",
    page_size: page_size_str = "20",
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
  const page = Number(page_str);
  const page_size = Number(page_size_str);

  const where: NonNullable<Parameters<typeof store.prisma.member.findMany>[0]>["where"] = {
    remark: {
      contains: name,
    },
    user_id,
    delete: 0,
  };

  const list = await store.prisma.member.findMany({
    where,
    include: {
      member_tokens: {
        select: {
          id: true,
          token: true,
        },
      },
    },
    skip: (page - 1) * page_size,
    take: page_size,
    orderBy: {
      created: "desc",
    },
  });
  const count = await store.prisma.member.count({
    where,
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      list: list.map((member) => {
        const { id, remark, member_tokens } = member;
        return {
          id,
          remark,
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
