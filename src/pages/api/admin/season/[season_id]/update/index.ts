/**
 * @file 手动修改指定季详情信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { MediaProfileSourceTypes } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { season_id: id } = req.body as Partial<{ season_id: string }>;
  const { name, episode_count, air_date } = req.body as Partial<{
    name: string;
    episode_count: number;
    air_date: number;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少季 id"));
  }
  if (!name && !episode_count && !air_date) {
    return e(Result.Err("没有要变更的内容"));
  }
  const season = await store.prisma.season.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      profile: true,
      tv: {
        include: {
          profile: true,
        },
      },
    },
  });
  if (!season) {
    return e(Result.Err("没有匹配的记录"));
  }
  const tv_payload: Parameters<typeof store.prisma.tv_profile.update>[0]["data"] = {
    source: MediaProfileSourceTypes.Manual,
  };
  if (name && name !== season.tv.profile.name) {
    tv_payload.name = name;
  }
  const season_payload: Parameters<typeof store.prisma.season_profile.update>[0]["data"] = {
    source: MediaProfileSourceTypes.Manual,
  };
  if (episode_count !== undefined && episode_count !== season.profile.episode_count) {
    season_payload.episode_count = episode_count;
  }
  if (air_date !== undefined && air_date !== dayjs(season.profile.air_date).unix()) {
    season_payload.air_date = dayjs(air_date).format("YYYY-MM-DD");
  }
  await store.prisma.tv_profile.update({
    where: { id: season.tv.profile.id },
    data: tv_payload,
  });
  await store.prisma.season_profile.update({
    where: { id: season.profile.id },
    data: season_payload,
  });
  res.status(200).json({ code: 0, msg: "更新成功", data: null });
}
