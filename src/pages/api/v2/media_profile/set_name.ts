/**
 * @file 针对名字没有正确处理的剧集
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_media_profile_set_name(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { media_id, name, original_name, auto_season_name } = req.body as Partial<{
    media_id: string;
    name: string;
    original_name: string;
    auto_season_name: boolean;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!media_id) {
    return e(Result.Err("缺少 id"));
  }
  if (!name) {
    return e(Result.Err("缺少 name"));
  }
  const media_profile = await store.prisma.media_profile.findFirst({
    where: {
      id: media_id,
    },
    include: {
      series: {
        include: {
          media_profiles: true,
        },
      },
    },
  });
  if (!media_profile) {
    return e(Result.Err("没有匹配记录"));
  }
  if (!auto_season_name) {
    await store.prisma.media_profile.update({
      where: {
        id: media_profile.id,
      },
      data: {
        name,
        original_name: !original_name ? null : original_name,
        tips: null,
      },
    });
    return res.status(200).json({ code: 0, msg: "", data: null });
  }
  const series = media_profile.series;
  if (series) {
    await store.prisma.media_series_profile.update({
      where: {
        id: series.id,
      },
      data: {
        name,
        original_name: !original_name ? null : original_name,
      },
    });
    for (let i = 0; i < series.media_profiles.length; i += 1) {
      const media_profile1 = series.media_profiles[i];
      await store.prisma.media_profile.update({
        where: {
          id: media_profile1.id,
        },
        data: {
          name: (() => {
            if (media_profile1.order === 1) {
              return name;
            }
            return `${name} 第${media_profile1.order}季`;
          })(),
          original_name: !original_name ? null : original_name,
          tips: null,
        },
      });
    }
    return res.status(200).json({ code: 0, msg: "", data: null });
  }
  await store.prisma.media_profile.update({
    where: {
      id: media_profile.id,
    },
    data: {
      name: (() => {
        if (media_profile.order === 1) {
          return name;
        }
        return `${name} 第${media_profile.order}季`;
      })(),
      original_name: !original_name ? null : original_name,
      tips: null,
    },
  });
  return res.status(200).json({ code: 0, msg: "", data: null });
}
