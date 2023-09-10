/**
 * @file 更新未识别的季 季数
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { app, store } from "@/store";
import { MediaSearcher } from "@/domains/searcher";
import { Drive } from "@/domains/drive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const { season_number } = req.body as Partial<{ season_number: string }>;

  if (!id) {
    return e("缺少季 id");
  }
  if (!season_number) {
    return e("缺少 season_number");
  }
  if (!season_number.match(/[sS][0-9]{1,}/)) {
    return e("season 不满足 [sS][0-9]{1,} 格式");
  }

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;

  const parsed_season = await store.prisma.parsed_season.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      parsed_tv: true,
    },
  });
  if (!parsed_season) {
    return e("没有匹配的季");
  }

  const { parsed_tv_id, parsed_tv, drive_id } = parsed_season;
  if (parsed_season.season_number === season_number) {
    return e(Result.Err(`季已经是 '${season_number}' 了`));
  }
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const searcher_res = await MediaSearcher.New({
    user,
    drive,
    tmdb_token: user.settings.tmdb_token,
    assets: app.assets,
    force: true,
    store,
  });
  if (searcher_res.error) {
    return e(searcher_res);
  }
  const searcher = searcher_res.data;
  const r = await searcher.process_parsed_season({
    parsed_tv,
    parsed_season: {
      ...parsed_season,
      season_number,
    },
  });
  if (r.error) {
    return e(r.error);
  }
  const r2 = await store.update_parsed_season(parsed_season.id, {
    season_number,
    correct_season_number: season_number,
  });
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({ code: 0, msg: "修改成功", data: null });
}
