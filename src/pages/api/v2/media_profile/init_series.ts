/**
 * @file 从 TMDB 搜索到 tv 后
 * 如果该 series 已经存在，直接返回对应的 media_profile，否则就，使用 tv_id 初始化 * media_profile 和 media_source_profile
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store/index";
import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { MediaTypes } from "@/constants/index";
import { BaseApiResp, Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { MediaProfileClient } from "@/domains/media_profile";

export default async function v2_media_profile_init_series(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { type, series_id } = req.body as Partial<{
    type: MediaTypes;
    series_id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!series_id) {
    return Result.Err("缺少 series_id");
  }
  const where: ModelQuery<"media_series_profile"> = {
    id: series_id,
  };
  if (type) {
    where.type = type;
  }
  const profiles_r = await (async () => {
    const existing = await store.prisma.media_series_profile.findFirst({
      where: {
        id: series_id,
      },
      include: {
        media_profiles: true,
      },
    });
    if (existing && existing.media_profiles.length) {
      return Result.Ok(existing.media_profiles);
    }
    const profile_client_res = await MediaProfileClient.New({
      token: user.settings.tmdb_token,
      assets: app.assets,
      store,
    });
    if (profile_client_res.error) {
      return Result.Err(profile_client_res.error.message);
    }
    const profile_client = profile_client_res.data;
    const r = await profile_client.cache_tv_profile({ id: series_id }, { force: true });
    if (r.error) {
      return Result.Err(r.error.message);
    }
    return Result.Ok(r.data.media_profiles);
  })();
  if (profiles_r.error) {
    return e(Result.Err(profiles_r.error.message));
  }
  const profiles = profiles_r.data;
  const data = {
    list: profiles.map((media_profile) => {
      const { id, type, name, original_name, poster_path, overview, air_date, order } = media_profile;
      return {
        id,
        type,
        name,
        original_name: name === original_name ? null : original_name,
        poster_path,
        overview,
        air_date,
        order,
      };
    }),
    next_marker: null,
  };
  return res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
