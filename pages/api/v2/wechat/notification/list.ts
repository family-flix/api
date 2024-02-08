/**
 * @file 获取消息列表列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { MemberNotifyWhereInput, ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    status,
    type = 1,
    next_marker = "",
    page_size = 20,
  } = req.body as Partial<{
    name: string;
    status: number;
    type: number;
    next_marker: string;
    page_size: number;
  }>;
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
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
  const where: ModelQuery<"member_notification"> = {
    member_id: member.id,
    is_delete: 0,
  };
  if (queries.length !== 0) {
    where.AND = queries;
  }
  const count = await store.prisma.member_notification.count({
    where,
  });
  const result = await store.list_with_cursor({
    fetch(extra) {
      return store.prisma.member_notification.findMany({
        where,
        orderBy: {
          created: "desc",
        },
        ...extra,
      });
    },
    next_marker,
    page_size,
  });
  const data = {
    total: count,
    page_size,
    next_marker: result.next_marker,
    list: result.list.map((notify) => {
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
