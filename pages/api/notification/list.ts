/**
 * @file 获取消息列表列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { MemberNotifyWhereInput, ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { toNumber } from "@/utils/primitive";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    status: status_str,
    type: type_str,
    page: page_str,
    page_size: page_size_str,
  } = req.query as Partial<{
    name: string;
    status: string;
    type: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const page = toNumber(page_str, 1);
  const page_size = toNumber(page_size_str, 20);
  const type = toNumber(type_str, 1);
  const status = toNumber(status_str, null);
  let queries: MemberNotifyWhereInput[] = [];
  if (type) {
    queries = queries.concat({
      type,
    });
  }
  if (status) {
    queries = queries.concat({
      status,
    });
  }
  const where: ModelQuery<typeof store.prisma.member_notification.findMany>["where"] = {
    member_id: member.id,
    is_delete: 0,
  };
  if (queries.length !== 0) {
    where.AND = queries;
  }
  const count = await store.prisma.member_notification.count({
    where,
  });
  const list = await store.prisma.member_notification.findMany({
    where,
    skip: (page - 1) * page_size,
    take: page_size,
    orderBy: {
      created: "desc",
    },
  });
  const data = {
    total: count,
    page,
    page_size,
    no_more: list.length + (page - 1) * page_size >= count,
    list: list.map((notify) => {
      const { id, content, status, created } = notify;
      return {
        id,
        content,
        status,
        created,
      };
    }),
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
