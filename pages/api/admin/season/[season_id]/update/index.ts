/**
 * @file 手动修改指定季详情信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { SeasonProfileRecord } from "@/domains/store/types";
import { MediaProfileSourceTypes } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { season_id: id } = req.query as Partial<{ season_id: string }>;
  const { name, overview, poster_path, episode_count, air_date } = req.body as Partial<{
    name: string;
    overview: string;
    poster_path: string;
    episode_count: number;
    air_date: number;
  }>;
  if (!id) {
    return e(Result.Err("缺少季 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const season = await store.prisma.season.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      profile: true,
    },
  });
  if (!season) {
    return e(Result.Err("没有匹配的记录"));
  }
  const payload: Parameters<typeof store.prisma.season_profile.update>[0]["data"] = {
    source: MediaProfileSourceTypes.Manual,
  };
  if (name !== season.profile.name) {
    payload.name = name;
  }
  if (overview !== undefined && overview !== season.profile.overview) {
    payload.overview = overview;
  }
  if (episode_count !== undefined && episode_count !== season.profile.episode_count) {
    payload.episode_count = episode_count;
  }
  if (air_date !== undefined && air_date !== dayjs(season.profile.air_date).unix()) {
    payload.air_date = dayjs(air_date).format("YYYY-MM-DD");
  }
  await store.prisma.season_profile.update({
    where: { id: season.profile.id },
    data: payload,
  });
  res.status(200).json({ code: 0, msg: "更新成功", data: null });
}
