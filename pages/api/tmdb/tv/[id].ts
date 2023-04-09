/**
 * @file TMDB 获取电视剧详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { TMDBClient } from "@/domains/tmdb";
import { BaseApiResp } from "@/types";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const { query } = req;
  const { id } = query;
  const client = new TMDBClient({ token: process.env.TMDB_TOKEN });
  const { error, data } = await client.fetch_tv_profile(id as string);
  if (error) {
    return res.status(200).json({ code: 1002, msg: error.message, data: null });
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
