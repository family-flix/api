/**
 * @file 获取 邀请的成员 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { MemberWhereInput } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    remark,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
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
  const page = Number(page_str);
  const page_size = Number(page_size_str);
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
    orderBy: {
      created: "asc",
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    page,
    page_size,
    no_more: list.length + (page - 1) * page_size >= count,
    list,
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
