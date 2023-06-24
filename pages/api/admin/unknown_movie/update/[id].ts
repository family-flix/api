/**
 * @file 更新未识别的电影名称
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { app, store } from "@/store";
import { MediaSearcher } from "@/domains/searcher";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const { name } = req.body as Partial<{ name: string }>;

  if (!id) {
    return e("缺少电影 id");
  }
  if (!name) {
    return e("缺少正确的电影名称");
  }

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const parsed_movie = await store.prisma.parsed_movie.findFirst({
    where: {
      id,
      user_id: user.id,
    },
  });
  if (!parsed_movie) {
    return e("没有匹配的季");
  }

  const { drive_id } = parsed_movie;
  if (parsed_movie.name === name) {
    return e(`名称已经是 '${name}' 了`);
  }
  const searcher_res = await MediaSearcher.New({
    user_id: user.id,
    drive_id,
    tmdb_token: user.settings.tmdb_token,
    assets: app.assets,
    force: true,
    store,
  });
  if (searcher_res.error) {
    return e(searcher_res);
  }
  const searcher = searcher_res.data;
  const r = await searcher.add_movie_from_parsed_movie({
    parsed_movie: {
      ...parsed_movie,
      correct_name: name,
    },
  });
  if (r.error) {
    return e(r.error);
  }
  const r2 = await store.update_parsed_movie(parsed_movie.id, {
    correct_name: name,
  });
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({ code: 0, msg: "修改成功", data: null });
}
