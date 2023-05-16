/**
 * @file 获取未知电视剧列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, resultify } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { query } = req;
  const { page = "1", page_size = "20" } = query as Partial<{
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  if (!authorization) {
    return e("please login");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  //   const res = await resultify(store.prisma.tV.findMany.bind(store.prisma.tV))({
  // 	where: {
  // 		searched_tv_id: null,
  // 	}
  //   });
  const r2 = await store.find_maybe_tv_with_pagination(
    {
      where: {
        searched_tv_id: null,
        tv_id: null,
        user_id,
      },
    },
    { page: Number(page), size: Number(page_size) }
  );
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: r2.data,
  });
}
