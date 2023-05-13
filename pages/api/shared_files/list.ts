/**
 * @file 转存文件历史
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    name,
    page = "1",
    page_size = "20",
  } = req.query as Partial<{
    name: string;
    page: string;
    page_size: string;
  }>;
  const t_resp = parse_token(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const r1 = await store.find_shared_files_list_with_pagination(
    {
      title: (() => {
        if (name) {
          return `%${name}%`;
        }
        return undefined;
      })(),
      user_id,
    },
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
