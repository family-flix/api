/**
 * @file 获取影视剧详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_media_profile_profile(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { series_id } = req.body as Partial<{
    series_id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!series_id) {
    return e(Result.Err("缺少 id"));
  }
  const media_profile = await store.prisma.media_series_profile.findFirst({
    where: {
      id: series_id,
    },
    include: {
	_count: true,
    }
  });
  if (!media_profile) {
    return e(Result.Err("没有匹配记录"));
  }
  const {
    id,
    type,
    name,
    original_name,
    poster_path,
    overview,
    air_date,
    _count,
  } = media_profile;
  const data = {
    id,
    type,
    name,
    original_name: name === original_name ? null : original_name,
    poster_path,
    overview,
    air_date,
    source_count: _count.media_profiles,
  };
  return res.status(200).json({ code: 0, msg: "", data });
}