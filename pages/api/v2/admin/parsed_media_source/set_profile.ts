/**
 * @file 改变一个解析记录的关联详情
 * 1. 如果该解析记录没有详情，就设置
 * 2. 如果该记录已经有详情，就覆盖
 * 3. 极端情况，本来识别为 A.E01，修改成 B.E02，要不要将 A.E03 变成 B.E03？
 * ，会创建新的 B 而且不影响原先 parsed_media？
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { MediaSearcher } from "@/domains/searcher/v2";
import { MediaProfileClient } from "@/domains/media_profile";
import { BaseApiResp, Result } from "@/types";
import { MediaTypes } from "@/constants";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { parsed_media_source_id, media_profile, media_source_profile } = req.body as Partial<{
    parsed_media_source_id: string;
    media_profile: {
      id: string;
      type: MediaTypes;
      name: string;
    };
    media_source_profile: {
      id: string;
    };
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!parsed_media_source_id) {
    return e(Result.Err("缺少解析记录 id"));
  }
  if (!media_profile) {
    return e(Result.Err("缺少详情信息"));
  }
  // if (media_profile.type === MediaTypes.Season && !source_profile_id) {
  //   return e(Result.Err("缺少详情 id"));
  // }
  const parsed_media_source = await store.prisma.parsed_media_source.findFirst({
    where: {
      id: parsed_media_source_id,
      user_id: user.id,
    },
    include: {
      parsed_media: {
        include: {
          media_profile: true,
        },
      },
    },
  });
  if (!parsed_media_source) {
    return e(Result.Err("请先索引该文件"));
  }
  const source_profile_r = await (async () => {
    const existing = await store.prisma.media_source_profile.findFirst({
      where: {
        id: media_profile.id,
      },
      include: {
        media_profile: true,
      },
    });
    if (existing) {
      return Result.Ok(existing.media_profile);
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
    if (media_profile.type === MediaTypes.Movie) {
      return profile_client.cache_movie_profile({ id: media_profile.id });
    }
    if (media_profile.type === MediaTypes.Season) {
      const [series_id, season_number] = media_profile.id.split("/").filter(Boolean).map(Number);
      return profile_client.cache_season_profile({ tv_id: String(series_id), season_number });
    }
    return Result.Err("未知的 type");
  })();
  if (source_profile_r.error) {
    return e(Result.Err(source_profile_r.error.message));
  }
  const profile = source_profile_r.data;
  const searcher_res = await MediaSearcher.New({
    user,
    store,
    assets: app.assets,
  });
  if (searcher_res.error) {
    return e(Result.Err(searcher_res.error.message));
  }
  const searcher = searcher_res.data;
  if (media_profile.type === MediaTypes.Movie) {
    const media = await searcher.get_movie_media_record_by_profile(media_profile);
    const media_source = await searcher.get_movie_media_source_record_by_profile(media_profile, {
      id: media.id,
    });
    await store.prisma.parsed_media_source.update({
      where: {
        id: parsed_media_source.id,
      },
      data: {
        type: MediaTypes.Movie,
        parsed_media_id: null,
        media_source_id: media_source.id,
      },
    });
    res.status(200).json({ code: 0, msg: "设置成功", data: null });
    return;
  }
  if (media_profile.type === MediaTypes.Season) {
    if (!media_source_profile) {
      return e(Result.Err("缺少剧集详情"));
    }
    const media = await searcher.get_season_media_record_by_profile(media_profile);
    const media_source = await searcher.get_season_media_source_record_by_profile(media_source_profile, {
      id: media.id,
      name: media_profile.name,
    });
    if (!parsed_media_source.parsed_media) {
      // 默认情况都会有 parsed_media，但是如果曾经设置过详情，可能会被清掉
      await store.prisma.parsed_media_source.update({
        where: {
          id: parsed_media_source.id,
        },
        data: {
          type: MediaTypes.Season,
          media_source_id: media_source.id,
        },
      });
      res.status(200).json({ code: 0, msg: "设置成功", data: null });
      return;
    }
    if (!parsed_media_source.parsed_media.media_profile) {
      // 1、parsed_source.parsed_media 没有匹配到
      // 等于 SeasonName.EpisodeText01 设置为 A.E01
      await store.prisma.parsed_media_source.update({
        where: {
          id: parsed_media_source.id,
        },
        data: {
          type: MediaTypes.Season,
          media_source_id: media_source.id,
        },
      });
      await store.prisma.parsed_media.update({
        where: {
          id: parsed_media_source.parsed_media.id,
        },
        data: {
          type: MediaTypes.Season,
          media_profile_id: media.profile_id,
        },
      });
      // 其他同一个 parsed_media 下，且没有匹配到详情的，都统一 type
      await store.prisma.parsed_media_source.updateMany({
        where: {
          id: {
            not: parsed_media_source_id,
          },
          media_source_id: null,
        },
        data: {
          type: MediaTypes.Season,
        },
      });
      res.status(200).json({ code: 0, msg: "设置成功", data: null });
      return;
    }
    console.log(3);
    if (!parsed_media_source.media_source_id) {
      // 2、parsed_source.source 为空
      if (parsed_media_source.parsed_media.media_profile_id === media.profile_id) {
        // 2.1、且 parsed_source.parsed_media.media.profile 是同一个，仅更新 media_source 即可
        // 等于 A.EpisodeText01 设置为 A.E02
        await store.prisma.parsed_media_source.update({
          where: {
            id: parsed_media_source.id,
          },
          data: {
            type: MediaTypes.Season,
            media_source_id: media_source.id,
          },
        });
        res.status(200).json({ code: 0, msg: "设置成功", data: null });
        return;
      }
      // 2.2、parsed_source.parsed_media.media.profile 不同
      // 等于 A.EpisodeText01 设置为 B.E01
      await store.prisma.parsed_media_source.update({
        where: {
          id: parsed_media_source.id,
        },
        data: {
          type: MediaTypes.Season,
          parsed_media_id: null,
          media_source_id: media_source.id,
        },
      });
      res.status(200).json({ code: 0, msg: "设置成功", data: null });
      return;
    }
    console.log(4);
    // 3、已经有匹配的电视剧、剧集详情，换成另一个
    // 等于 A.E01 换成 B.E01
    await store.prisma.parsed_media_source.update({
      where: {
        id: parsed_media_source.id,
      },
      data: {
        type: MediaTypes.Season,
        parsed_media_id: null,
        media_source_id: media_source.id,
      },
    });
    res.status(200).json({ code: 0, msg: "设置成功", data: null });
    return;
  }
  return e(Result.Err("未知的 type"));
}
