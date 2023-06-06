/**
 * @file 根据一个名字，返回匹配改名字的所有文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { parse_filename_for_video } from "@/utils";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { name } = req.query as Partial<{ name: string }>;
  if (!name) {
    return e("请传入文件夹名称");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const { name: parsed_name } = parse_filename_for_video(name, ["name"]);
  const r = await store.find_files({
    name: `%${parsed_name}%`,
    user_id,
  });
  if (r.error) {
    return e(r);
  }
  console.log(r.data);
  res.status(200).json({ code: 0, msg: "", data: r.data });
}
