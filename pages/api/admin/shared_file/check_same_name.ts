/**
 * @file 检查是否有同名影视剧（可能存在文件夹名不同但是是同一个电视剧）
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { parse_filename_for_video } from "@/utils";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  // const e = response_error_factory(res);
  // const { authorization } = req.headers;
  // const { file_name } = req.body as Partial<{ file_name: string }>;
  // if (!file_name) {
  //   return e("缺少文件夹名称参数");
  // }
  // const t_res = await User.New(authorization, store);
  // if (t_res.error) {
  //   return e(t_res);
  // }
  // const { id: user_id } = t_res.data;
  // const { name, original_name } = parse_filename_for_video(file_name, ["name", "original_name"]);
  // if (!name && !original_name) {
  //   return e(`'${file_name}' 不是影视剧文件名`);
  // }
  // const r = await store.operation
  //   .get(`SELECT searched_tv.poster_path,searched_tv.name,searched_tv.original_name,searched_tv.overview,searched_tv.first_air_date,tv.id
  // FROM tv
  // INNER JOIN searched_tv
  // ON tv.tv_profile_id = searched_tv.id
  // WHERE user_id = '${user_id}' AND searched_tv.name = '${name}' OR searched_tv.original_name = '${original_name}';`);
  // if (r.error) {
  //   return e(r);
  // }
  // if (r.data) {
  //   res.status(200).json({ code: 0, msg: "", data: r.data });
  //   return;
  // }
  res.status(200).json({ code: 0, msg: "", data: null });
}
