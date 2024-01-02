/**
 * @file 设置未匹配的影视剧详情信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ParsedMediaSourceRecord } from "@/domains/store/types";
import { MediaSearcher } from "@/domains/searcher/v2";
import { BaseApiResp, Result } from "@/types";
import { MediaTypes } from "@/constants";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";
import { MediaProfileClient } from "@/domains/media_profile";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { media_id, media_profile } = req.body as Partial<{
    media_id: string;
    media_profile: {
      id: string;
      type: MediaTypes;
      name: string;
    };
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!media_id) {
    return e(Result.Err("缺少记录 id"));
  }
  if (!media_profile) {
    return e(Result.Err("缺少详情信息"));
  }
  const cur_media = await store.prisma.media.findFirst({
    where: {
      id: media_id,
      user_id: user.id,
    },
    include: {
      media_sources: {
        include: {
          files: true,
        },
      },
    },
  });
  if (!cur_media) {
    return e(Result.Err("没有匹配的记录"));
  }
  if (cur_media.profile_id === media_profile.id) {
    return e(Result.Err("该详情已经是期望的值了"));
  }
  const searcher_res = await MediaSearcher.New({
    user,
    store,
    assets: app.assets,
  });
  if (searcher_res.error) {
    return e(Result.Err(searcher_res.error.message));
  }
  const searcher = searcher_res.data;
  const profile_r = await (async () => {
    const existing = await store.prisma.media_profile.findFirst({
      where: {
        id: media_profile.id,
        type: media_profile.type,
      },
      include: {
        source_profiles: true,
        origin_country: true,
        genres: true,
      },
    });
    if (existing && existing.source_profiles.length) {
      return Result.Ok(existing);
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
  if (profile_r.error) {
    return e(Result.Err(profile_r.error.message));
  }
  const profile = profile_r.data;
  if (profile.type === MediaTypes.Movie) {
    const media = await searcher.get_movie_media_record_by_profile(profile);
    const matched = profile.source_profiles[0];
    if (!matched) {
      return e(Result.Err("详情信息异常"));
    }
    const media_source = await searcher.get_movie_media_source_record_by_profile(matched, {
      id: media.id,
    });
    const cur_media_sources = await store.prisma.media_source.findMany({
      where: {
        media_id: cur_media.id,
      },
      include: {
        files: true,
      },
    });
    const files = cur_media_sources.reduce((total, cur) => {
      return total.concat(cur.files);
    }, [] as ParsedMediaSourceRecord[]);
    // 这个逻辑就是完全不管现在这个，直接把现在这个关联的视频文件，重新再匹配一次
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      await store.prisma.parsed_media_source.update({
        where: {
          id: file.id,
        },
        data: {
          type: MediaTypes.Movie,
          media_source_id: media_source.id,
          parsed_media_id: null,
        },
      });
    }
    res.status(200).json({
      code: 0,
      msg: "变更详情成功",
      data: {
        media_id: media.id,
      },
    });
    return;
  }
  if (profile.type === MediaTypes.Season) {
    // 这个 media 是根据新详情获取到的，可能是新的，也可能是已经是这个详情的另一条电视剧记录
    const media = await searcher.get_season_media_record_by_profile(profile);
    const cur_media_sources = await store.prisma.media_source.findMany({
      where: {
        media_id: cur_media.id,
      },
      include: {
        files: true,
      },
    });
    const files = cur_media_sources.reduce((total, cur) => {
      return total.concat(cur.files);
    }, [] as ParsedMediaSourceRecord[]);
    // 这个逻辑就是完全不管现在这个，直接把现在这个关联的视频文件，重新再匹配一次
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const matched = await searcher.find_matched_source_profile(profile.source_profiles, file);
      if (matched) {
        const media_source = await searcher.get_season_media_source_record_by_profile(matched, {
          id: media.id,
          name: media.text,
        });
        await store.prisma.parsed_media_source.update({
          where: {
            id: file.id,
          },
          data: {
            type: MediaTypes.Season,
            media_source_id: media_source.id,
            parsed_media_id: null,
          },
        });
      }
    }
    res.status(200).json({
      code: 0,
      msg: "变更详情成功",
      data: {
        media_id: media.id,
      },
    });
    return;
  }
  return e(Result.Err("未知的 type"));
}
