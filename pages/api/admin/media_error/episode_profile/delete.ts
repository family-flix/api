/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { parseJSONStr } from "@/utils";
import { MediaErrorTypes } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, profile_id } = req.body as Partial<{ id: string; profile_id: string }>;

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const error_record = await store.prisma.media_error_need_process.findFirst({
    where: {
      id,
      type: MediaErrorTypes.EpisodeProfile,
      user_id: user.id,
    },
  });
  if (!error_record) {
    return e(Result.Err("没有匹配的记录"));
  }
  if (!error_record.profile) {
    return e(Result.Err("没有 profile 值"));
  }
  const profile = await store.prisma.episode_profile.findFirst({
    where: {
      id: profile_id,
    },
    include: {
      episodes: true,
    },
  });
  if (!profile) {
    return e(Result.Err("没有匹配的记录"));
  }
  await store.prisma.episode.delete({
    where: {
      id: profile.id,
    },
  });
  const origin_error_profiles_r = parseJSONStr<{
    index: number;
    type: number;
    unique_id: string;
    profiles: {
      id: string;
      name: string;
      poster_path: string | null;
      season_number: number;
      episode_number: number;
      episode_count: number;
      episodes: {
        source_count: number;
      };
    }[];
  }>(error_record.profile);
  if (origin_error_profiles_r.error) {
    return e(Result.Err(origin_error_profiles_r.error.message));
  }
  const origin_profile = origin_error_profiles_r.data;
  origin_profile.profiles = origin_profile.profiles.filter((p) => {
    return p.id === profile_id;
  });
  if (origin_profile.profiles.length === 1) {
    await store.prisma.media_error_need_process.delete({
      where: {
        id: error_record.id,
      },
    });
    res.status(200).json({ code: 0, msg: "删除成功", data: null });
    return;
  }
  res.status(200).json({
    code: 0,
    msg: "删除成功，但仍存在重复数据",
    data: {
      id: error_record.id,
      type: error_record.type,
      profile: JSON.stringify(origin_profile),
    },
  });
}
