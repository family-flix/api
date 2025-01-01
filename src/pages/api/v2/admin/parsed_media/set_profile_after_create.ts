/**
 * @file 创建一个自定义详情后设置给指定未匹配的影视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { MediaSearcher } from "@/domains/searcher/v2";
import { MediaProfileClient } from "@/domains/media_profile";
import { Result } from "@/domains/result/index";
import { MediaTypes } from "@/constants/index";
import { response_error_factory } from "@/utils/server";
import { r_id } from "@/domains/store/utils";

export default async function v2_admin_parsed_media_set_profile_after_create(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { parsed_media_id, media_profile } = req.body as Partial<{
    parsed_media_id: string;
    media_profile: {
      type: MediaTypes;
      name: string;
      overview: string;
      poster_path: string;
      air_date: string;
      order: number;
      episodes: {
        name: string;
        overview: string;
        order: number;
      }[];
    };
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!parsed_media_id) {
    return e(Result.Err("缺少记录 id"));
  }
  if (!media_profile) {
    return e(Result.Err("缺少详情信息"));
  }
  const parsed_media = await store.prisma.parsed_media.findFirst({
    where: {
      id: parsed_media_id,
      user_id: user.id,
    },
    include: {
      parsed_sources: true,
    },
  });
  if (!parsed_media) {
    return e(Result.Err("没有匹配的记录"));
  }
  const r1 = await (async () => {
    const existing = await store.prisma.media_profile.findFirst({
      where: {
        type: media_profile.type,
        name: media_profile.name,
      },
    });
    if (existing) {
      return Result.Err("已经存在该详情了");
    }
    const id = r_id();
    const profile = await store.prisma.media_profile.create({
      data: {
        id,
        type: media_profile.type,
        name: media_profile.name,
        overview: media_profile.overview || null,
        air_date: media_profile.air_date || null,
        order: media_profile.order,
        poster_path: media_profile.poster_path || null,
        source_count: media_profile.episodes.length,
      },
    });
    for (let i = 0; i < media_profile.episodes.length; i += 1) {
      const episode = media_profile.episodes[i];
      await store.prisma.media_source_profile.create({
        data: {
          id: r_id(),
          type: media_profile.type,
          name: episode.name,
          overview: episode.overview || null,
          order: episode.order,
          media_profile_id: id,
        },
      });
    }
    return Result.Ok(profile);
  })();
  if (r1.error) {
    return e(r1);
  }
  const profile = r1.data;
  const searcher_res = await MediaSearcher.New({
    assets: app.assets,
    user,
    store,
  });
  if (searcher_res.error) {
    return e(Result.Err(searcher_res.error.message));
  }
  const searcher = searcher_res.data;
  if (profile.type === MediaTypes.Movie) {
    const media = await searcher.get_movie_media_record_by_profile(profile);
    const updated_parsed_media = await store.prisma.parsed_media.update({
      where: {
        id: parsed_media.id,
      },
      data: {
        type: MediaTypes.Movie,
        media_profile_id: media.profile_id,
      },
      include: {
        media_profile: true,
      },
    });
    for (let i = 0; i < parsed_media.parsed_sources.length; i += 1) {
      const parsed_source = parsed_media.parsed_sources[i];
      await searcher.process_movie_media_source({
        ...parsed_source,
        parsed_media: updated_parsed_media,
      });
    }
    return res.status(200).json({ code: 0, msg: "变更详情成功", data: null });
  }
  if (profile.type === MediaTypes.Season) {
    const media = await searcher.get_season_media_record_by_profile(profile);
    const updated_parsed_media = await store.prisma.parsed_media.update({
      where: {
        id: parsed_media.id,
      },
      data: {
        type: MediaTypes.Season,
        media_profile_id: media.profile_id,
      },
      include: {
        media_profile: true,
      },
    });
    for (let i = 0; i < parsed_media.parsed_sources.length; i += 1) {
      const parsed_source = parsed_media.parsed_sources[i];
      await searcher.process_season_media_source({
        ...parsed_source,
        parsed_media: updated_parsed_media,
      });
    }
    return res.status(200).json({ code: 0, msg: "变更详情成功", data: null });
  }
  return e(Result.Err("未知的 type"));
}
