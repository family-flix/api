/**
 * @file 给未识别的文件夹绑定一个 tmdb 信息
 * 判断该 tmdb 信息是否存在再决定是否要创建新 tv 记录还是关联已存在的 tv
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { TVProfileItemInTMDB } from "@/domains/tmdb/services";
import { User } from "@/domains/user";
import { add_tv_from_parsed_tv_sub } from "@/domains/walker/search_tv_in_tmdb_then_update_tv";
import { store } from "@/store";
import { response_error_factory } from "@/utils/backend";
import { BaseApiResp } from "@/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const body = req.body as TVProfileItemInTMDB;
  if (!id) {
    return e("缺少未识别文件夹 id");
  }
  const t_resp = await User.New(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const tv_res = await store.find_parsed_tv({ id, user_id });
  if (tv_res.error) {
    return e(tv_res);
  }
  if (!tv_res.data) {
    return e("没有匹配的文件夹记录");
  }
  // const unknown_tv = tv_resp.data;
  // if (unknown_tv.tv_profile_id) {
  //   return e("该电视剧已有匹配的电视剧信息");
  // }
  const { id: tmdb_id } = body as TVProfileItemInTMDB & {
    id?: string;
  };
  const profile_res = await store.find_tv_profile({
    tmdb_id,
  });
  if (profile_res.error) {
    return e(profile_res.error);
  }
  const profile = profile_res.data;
  if (profile === null) {
    return e("没有匹配的电视剧详情");
  }
  const r2 = await add_tv_from_parsed_tv_sub(
    {
      profile,
      parsed_tv: tv_res.data,
    },
    {
      user_id,
      store,
      need_upload_image: true,
      token: process.env.TMDB_TOKEN,
    }
  );
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
