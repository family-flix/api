/**
 * @file 将给定的字符串进行解析
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_filename_for_video, VIDEO_ALL_KEYS } from "@/utils";
import { response_error_factory } from "@/utils/backend";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { query } = req;
  const { name } = query as Partial<{ name: string }>;
  if (!name) {
    return e("Please pass `name` string.");
  }
  const keys = VIDEO_ALL_KEYS;
  const result = parse_filename_for_video(name, keys);
  res.status(200).json({ code: 0, msg: "", data: result });
}
