/**
 * @file 获取指定影视剧详情
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { MediaTypes } from "@/constants/index";

export default async function v2_wechat_media_profile(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { media_id } = req.body as Partial<{
    media_id: string;
  }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  if (!media_id) {
    return e(Result.Err("缺少 id 参数"));
  }
  const media = await store.prisma.media.findFirst({
    where: {
      id: media_id,
      user_id: member.user.id,
    },
    include: {
      _count: true,
      profile: {
        include: {
          genres: true,
          origin_country: true,
          persons: {
            take: 5,
            where: {
              known_for_department: "star",
            },
            include: {
              profile: true,
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },
      media_sources: {
        include: {
          profile: true,
        },
        take: 1,
        orderBy: {
          profile: {
            order: "desc",
          },
        },
      },
    },
    orderBy: {
      profile: { air_date: "desc" },
    },
  });
  if (media === null) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { id, type, profile, media_sources, _count } = media;
  const {
    name,
    original_name,
    alias,
    overview,
    poster_path,
    air_date,
    source_count,
    vote_average,
    genres,
    origin_country,
  } = profile;
  const data = {
    id,
    type,
    name,
    original_name,
    alias,
    overview,
    episode_count: source_count,
    cur_episode_count: _count.media_sources,
    extra_text: (() => {
      if (type === MediaTypes.Movie) {
        return null;
      }
      if (!source_count) {
        return null;
      }
      if (media_sources.length === 0) {
        return null;
      }
      const latest = media_sources[0];
      if (_count.media_sources === source_count) {
        return `全${source_count}集`;
      }
      if (latest.profile.order === source_count) {
        return `收录${_count.media_sources}集`;
      }
      return `更新至${_count.media_sources}集`;
    })(),
    poster_path,
    air_date,
    origin_country: origin_country.map((country) => country.id),
    genres: genres.map((genre) => {
      return {
        value: genre.id,
        label: genre.text,
      };
    }),
    vote_average,
    actors: profile.persons
      .map((person) => {
        const { known_for_department, profile, order } = person;
        return {
          id: profile.id,
          name: profile.name,
          avatar: profile.profile_path,
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
