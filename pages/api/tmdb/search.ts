/**
 * @file TMDB 搜索电视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { TMDBClient } from "@/domains/tmdb";
import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  console.log(process.env.TMDB_TOKEN);
  const tmdb = new TMDBClient({
    token: process.env.TMDB_TOKEN,
  });
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    keyword,
    page = 1,
    page_size: pageSize = 20,
  } = req.query as Partial<{
    keyword: string;
    page: string;
    page_size: string;
  }>;
  if (!keyword) {
    return e("Missing keyword");
  }
  const r_token = await User.New(authorization);
  if (r_token.error) {
    return e(r_token);
  }
  const r = await tmdb.search_tv(keyword as string);
  if (r.error) {
    return e(r);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      no_more: Number(page) * Number(pageSize) >= r.data.total,
      ...r.data,
    },
  });
}
