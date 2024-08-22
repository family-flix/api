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
  const { media_id } = req.body as Partial<{
    media_id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!media_id) {
    return e(Result.Err("缺少 id"));
  }
  const media_profile = await store.prisma.media_profile.findFirst({
    where: {
      id: media_id,
    },
    include: {
      source_profiles: {
        include: {
          media_sources: {
            where: {
              user_id: user.id,
            },
            include: {
              files: true,
              subtitles: true,
            },
          },
        },
      },
      persons: {
        include: {
          profile: true,
        },
      },
    },
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
    backdrop_path,
    overview,
    air_date,
    order,
    source_count,
    vote_average,
    source_profiles,
    persons,
  } = media_profile;
  const data = {
    id,
    type,
    name,
    original_name: name === original_name ? null : original_name,
    poster_path,
    backdrop_path,
    overview,
    air_date,
    vote_average,
    source_count,
    order,
    series: null,
    episodes: source_profiles.map((source_profile) => {
      const { id, name, order, overview, still_path, runtime, media_sources } = source_profile;
      // 没有多租户，所以第一个，如果存在，肯定是我的
      const source = media_sources[0];
      return {
        id,
        name,
        overview,
        order,
        still_path,
        runtime,
        subtitles: source
          ? source.subtitles.map((subtitle) => {
              const { id, name, unique_id, type, language } = subtitle;
              return {
                type,
                id,
                name,
                url: unique_id,
                language,
              };
            })
          : [],
        files: source
          ? source.files.map((file) => {
              const { id, file_name } = file;
              return {
                id,
                file_name,
              };
            })
          : [],
      };
    }),
    actors: persons
      .map((person) => {
        const { known_for_department, profile, order } = person;
        return {
          id: profile.id,
          name: profile.name,
          role: known_for_department,
          order,
        };
      })
      .sort((a, b) => {
        const map: Record<string, number> = {
          star: 1,
          director: 2,
          scriptwriter: 3,
        };
        if (a.role && b.role) {
          return map[a.role] - map[b.role];
        }
        return a.order - b.order;
      }),
  };
  return res.status(200).json({ code: 0, msg: "", data });
}
