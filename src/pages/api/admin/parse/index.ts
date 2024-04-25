/**
 * @file 将给定的字符串进行解析
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { parse_filename_for_video, VideoKeys, VIDEO_ALL_KEYS } from "@/utils/parse_filename_for_video";
import { response_error_factory } from "@/utils/server";

export default async function v0_admin_parse(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { name, keys = VIDEO_ALL_KEYS } = req.body as Partial<{ name: string; keys: VideoKeys[] }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!name) {
    return e("缺少 `name` 参数");
  }
  const user = t_res.data;
  const result = parse_filename_for_video(name, keys, user.get_filename_rules());
  return res.status(200).json({ code: 0, msg: "", data: result });
}
