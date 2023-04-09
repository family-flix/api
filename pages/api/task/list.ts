/**
 * @file 获取异步任务
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { store } from "@/store/sqlite";

const { find_async_task_with_pagination } = store;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { page = "1", page_size = "20" } = req.query as Partial<{
    page: string;
    page_size: string;
  }>;
  const t_resp = parse_token(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const r1 = await find_async_task_with_pagination(
    { user_id },
    {
      page: Number(page),
      size: Number(page_size),
      sorts: [
        {
          key: "created",
          order: "DESC",
        },
      ],
    }
  );
  if (r1.error) {
    return e(r1);
  }
  res.status(200).json({ code: 0, msg: "", data: r1.data });
}
