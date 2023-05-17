/**
 * @file 获取索引任务列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { store } from "@/store";
import { response_error_factory } from "@/utils/backend";
import { BaseApiResp } from "@/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { page = "1", page_size = "20" } = req.query as Partial<{
    page: string;
    page_size: string;
  }>;
  const t_resp = await User.New(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const r = await store.find_task_list_with_pagination(
    {
      where: {
        user_id,
      },
    },
    {
      page: Number(page),
      page_size: Number(page_size),
      sorts: [
        {
          key: "created",
          order: "DESC",
        },
      ],
    }
  );
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: r.data });
}
