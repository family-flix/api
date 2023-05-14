/**
 * @file 获取 tv 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
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
  const resp = await store.find_tv_with_pagination(
    {
      searched_tv: undefined,
      user_id,
    },
    { page: Number(page), size: Number(page_size) }
  );
  if (resp.error) {
    return e(resp);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: resp.data,
  });
}
