/**
 * @file 给未识别的文件夹绑定一个 tmdb 信息
 * 判断该 tmdb 信息是否存在再决定是否要创建新 tv 记录还是关联已存在的 tv
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { TVProfileItemInTMDB } from "@/domains/tmdb/services";
import { User } from "@/domains/user";
import { MediaSearcher } from "@/domains/searcher";
import { app, store } from "@/store";
import { response_error_factory } from "@/utils/backend";
import { BaseApiResp } from "@/types";
import { Drive } from "@/domains/drive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const body = req.body as TVProfileItemInTMDB;
  if (!id) {
    return e("缺少电视剧 id");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id, settings } = user;
  if (!settings.tmdb_token) {
    return e("缺少 TMDB_TOKEN");
  }
  const tv_res = await store.find_parsed_tv({ id, user_id });
  if (tv_res.error) {
    return e(tv_res);
  }
  if (!tv_res.data) {
    return e("没有匹配的电视剧记录");
  }
  const parsed_tv = tv_res.data;
  const { drive_id } = parsed_tv;
  const { id: tmdb_id, name } = body as TVProfileItemInTMDB & {
    id?: string;
  };
  const drive_res = await Drive.Get({ id: drive_id, user_id, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const search = new MediaSearcher({
    user,
    drive,
    tmdb_token: settings.tmdb_token,
    assets: app.assets,
    store,
  });
  const profile_res = await search.get_tv_profile_with_tmdb_id({ tmdb_id });
  if (profile_res.error) {
    return e(profile_res);
  }
  const profile = profile_res.data;
  const r2 = await search.link_tv_profile_to_parsed_tv({
    parsed_tv,
    profile,
  });
  if (r2.error) {
    return e(r2);
  }
  await store.update_parsed_tv(parsed_tv.id, {
    correct_name: profile.name,
  });
  res.status(200).json({ code: 0, msg: "关联成功", data: null });
}
