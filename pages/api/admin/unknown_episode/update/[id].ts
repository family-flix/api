/**
 * @file 更新未识别的剧集信息
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
  const { season_number } = req.body as Partial<{ season_number: string }>;

  if (!id) {
    return e("缺少剧集 id");
  }
  // if (!season_number.match(/[sS][0-9]{1,}/)) {
  //   return e("season 不满足 [sS][0-9]{1,} 格式");
  // }

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;

  const parsed_episode = await store.prisma.parsed_episode.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      parsed_tv: true,
    },
  });
  if (!parsed_episode) {
    return e("没有匹配的季");
  }
  const { parsed_tv, drive_id } = parsed_episode;
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
  res.status(200).json({ code: 0, msg: "修改成功", data: null });
}
