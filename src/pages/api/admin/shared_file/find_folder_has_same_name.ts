/**
 * @file 根据一个名字，返回匹配该名字的所有文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { parse_filename_for_video } from "@/utils/parse_filename_for_video";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { name } = req.body as Partial<{ name: string }>;
  if (!name) {
    return e("请传入文件夹名称");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const { name: parsed_name } = parse_filename_for_video(name, ["name"]);
  const r = await store.prisma.file.findFirst({
    where: {
      name: {
        contains: parsed_name,
      },
      user_id,
    },
  });
  if (!r) {
    return e(Result.Err("没有找到匹配的记录"));
  }
  res.status(200).json({ code: 0, msg: "", data: r });
}
