/**
 * @file 更新未识别的电影名称
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store";
import { User } from "@/domains/user";
import { MediaSearcher } from "@/domains/searcher";
import { Drive } from "@/domains/drive";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const body = req.body as Partial<{ unique_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少电影 id"));
  }
  if (!body.unique_id) {
    return e(Result.Err("缺少正确的电影详情"));
  }
  const user = t_res.data;
  const parsed_movie = await store.prisma.parsed_movie.findFirst({
    where: {
      id,
      user_id: user.id,
    },
  });
  if (!parsed_movie) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { drive_id } = parsed_movie;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const searcher_res = await MediaSearcher.New({
    user,
    drive,
    assets: app.assets,
    force: true,
    store,
  });
  if (searcher_res.error) {
    return e(searcher_res);
  }
  const searcher = searcher_res.data;
  const profile_res = await searcher.get_movie_profile_with_tmdb_id({
    tmdb_id: Number(body.unique_id),
  });
  if (profile_res.error) {
    return e(profile_res.error);
  }
  const profile = profile_res.data;
  const r1 = await searcher.link_movie_profile_to_parsed_movie({
    parsed_movie,
    profile,
  });
  if (r1.error) {
    return e(r1);
  }
  const r2 = await store.update_parsed_movie(parsed_movie.id, {
    unique_id: profile_res.data.id,
  });
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({ code: 0, msg: "修改成功", data: null });
}
