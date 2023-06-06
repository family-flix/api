/**
 * @file 将给定的字符串进行解析
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { parse_filename_for_video, VideoKeys, VIDEO_ALL_KEYS } from "@/utils";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { name, keys = VIDEO_ALL_KEYS } = req.body as Partial<{ name: string; keys: VideoKeys[] }>;
  if (!name) {
    return e("缺少 `name` 参数");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const result = parse_filename_for_video(name, keys);
  res.status(200).json({ code: 0, msg: "", data: result });
}
