/**
 * @file 获取指定用户的成员
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { ModelQuery } from "@/domains/store/types";
import { response_error_factory } from "@/utils/server";

export default async function v0_admin_member_list(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    next_marker = "",
    page_size = 20,
  } = req.body as Partial<{
    name: string;
    next_marker: string;
    page_size: number;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
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
  const result = await store.list_with_cursor({
    fetch(extra) {
      return store.prisma.member.findMany({
        where,
        include: {
          tokens: {
            take: 5,
          },
          inviter: true,
        },
        orderBy: {
          created: "desc",
        },
        ...extra,
      });
    },
    next_marker,
    page_size,
  });
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      next_marker: result.next_marker,
      list: result.list.map((member) => {
        const { id, inviter, remark, tokens } = member;
        return {
          id,
          remark,
          inviter: inviter
            ? {
                id: inviter.id,
                remark: inviter.remark,
              }
            : null,
          tokens: tokens.map((token) => {
            const { id, token: value } = token;
            return {
              id,
              token: value,
            };
          }),
        };
      }),
      total: count,
      page_size,
    },
  });
}
