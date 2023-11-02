/**
 * @file 获取电视频道列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { ModelQuery } from "@/domains/store/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    page = 1,
    page_size = 20,
  } = req.body as Partial<{
    name: string;
    page: number;
    page_size: number;
  }>;
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const where: ModelQuery<"tv_live"> = {
    user_id: member.user.id,
  };
  const count = await store.prisma.tv_live.count({
    where,
  });
  const list = await store.prisma.tv_live.findMany({
    where,
    orderBy: {
      order: "asc",
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    list: list.map((tv) => {
      const { id, name, group_name, logo, url } = tv;
      return {
        id,
        name,
        logo,
        group_name,
        url,
      };
    }),
    page,
    page_size,
    no_more: list.length + (page - 1) * page_size >= count,
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
