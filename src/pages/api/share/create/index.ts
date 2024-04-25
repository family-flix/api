/**
 * @file 分享一个电视剧或电影给好友
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { create_link } from "@/domains/short_link/services";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { query_stringify, r_id } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { season_id, movie_id, target_member_id } = req.body as Partial<{
    season_id: string;
    movie_id: string;
    target_member_id: string;
  }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  if (!target_member_id) {
    return e(Result.Err("请选择分享目标"));
  }
  const valid_token = await store.prisma.member_token.findFirst({
    where: {
      member_id: member.id,
    },
  });
  if (!valid_token) {
    return e(Result.Err("成员没有可用的凭证"));
  }
  if (season_id) {
    const existing_season = await store.prisma.season.findFirst({
      where: {
        id: season_id,
        user_id: member.user.id,
      },
      include: {
        tv: {
          include: {
            profile: true,
          },
        },
        profile: true,
      },
    });
    if (!existing_season) {
      return e(Result.Err("没有匹配的记录"));
    }
    const existing_short_link = await store.prisma.shared_media.findFirst({
      where: {
        season_id,
        member_from_id: member.id,
        member_target_id: target_member_id,
      },
      include: {
        season: {
          include: {
            profile: true,
          },
        },
      },
    });
    if (existing_short_link) {
      return e(
        Result.Err("已分享给该好友", 50000, {
          id: existing_short_link.id,
          name: existing_season.tv.profile.name,
          poster_path: existing_season.profile.poster_path || existing_season.tv.profile.poster_path,
          url: existing_short_link.url,
        })
      );
    }
    const url = `http://media.funzm.com/mobile/tv_play?${query_stringify({
      id: existing_season.tv_id,
      season_id,
      token: valid_token.id,
      rate: 1.5,
      hide_menu: 1,
    })}`;
    const r = await create_link(url);
    if (r.error) {
      return e(Result.Err(r.error.message));
    }
    const created = await store.prisma.shared_media.create({
      data: {
        id: r_id(),
        url: r.data,
        season_id,
        member_target_id: target_member_id,
        member_from_id: member.id,
      },
    });
    res.status(200).json({
      code: 0,
      msg: "",
      data: {
        id: created.id,
        name: existing_season.tv.profile.name,
        poster_path: existing_season.profile.poster_path || existing_season.tv.profile.poster_path,
        url: r.data,
      },
    });
    return;
  }
  if (movie_id) {
    const existing_movie = await store.prisma.movie.findFirst({
      where: {
        id: movie_id,
        user_id: member.user.id,
      },
      include: {
        profile: true,
      },
    });
    if (!existing_movie) {
      return e(Result.Err("没有匹配的记录"));
    }
    const existing_short_link = await store.prisma.shared_media.findFirst({
      where: {
        movie_id,
        member_from_id: member.id,
        member_target_id: target_member_id,
      },
      include: {
        movie: {
          include: {
            profile: true,
          },
        },
      },
    });
    if (existing_short_link) {
      return e(
        Result.Err("已分享给该好友", 50000, {
          id: existing_short_link.id,
          name: existing_movie.profile.name,
          poster_path: existing_movie.profile.poster_path,
          url: existing_short_link.url,
        })
      );
    }
    const url = `http://media.funzm.com/mobile/movie_play?${query_stringify({
      id: existing_movie.id,
      token: valid_token.id,
      rate: 1.5,
      hide_menu: 1,
    })}`;
    const r = await create_link(url);
    if (r.error) {
      return e(Result.Err(r.error.message));
    }
    const created = await store.prisma.shared_media.create({
      data: {
        id: r_id(),
        url: r.data,
        movie_id,
        member_target_id: target_member_id,
        member_from_id: member.id,
      },
    });
    res.status(200).json({
      code: 0,
      msg: "",
      data: {
        id: created.id,
        name: existing_movie.profile.name,
        poster_path: existing_movie.profile.poster_path,
        url: r.data,
      },
    });
    return;
  }
  return e(Result.Err("缺少影视剧信息"));
}
