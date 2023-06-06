/**
 * @file TMDB 搜索电视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { TMDBClient } from "@/domains/tmdb";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    keyword,
    page: page_str = "1",
    page_size: page_size_str = "20",
    token,
  } = req.query as Partial<{
    keyword: string;
    page: string;
    page_size: string;
    token?: string;
  }>;
  if (!keyword) {
    return e("缺少搜索关键字");
  }

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id, settings } = t_res.data;
  const tmdb = new TMDBClient({
    token: token || settings.tmdb_token,
  });
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const r = await tmdb.search_tv(keyword, { page });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      no_more: page * page_size >= r.data.total,
      ...r.data,
    },
  });
}
