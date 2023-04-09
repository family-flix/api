/**
 * @file TMDB 搜索电视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { TMDBClient } from "@/domains/tmdb";
import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { FetchParams } from "@list-helper/core/typing";
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
    pageSize = 20,
  } = req.query as FetchParams & Partial<{ keyword: string }>;
  if (!keyword) {
    return e("Missing keyword");
  }
  const r_token = parse_token(authorization);
  if (r_token.error) {
    return e(r_token);
  }
  // log("search tmdb with", keyword);
  const r = await tmdb.search_tv(keyword as string);
  if (r.error) {
    return e(r);
  }
  // log("search tmdb with", keyword, "success");
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      no_more: Number(page) * Number(pageSize) >= r.data.total,
      ...r.data,
    },
  });
}
