/**
 * @file 获取本地索引到的影视剧详情列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { MediaTypes } from "@/constants";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";
import { MediaProfileClient } from "@/domains/media_profile";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    type,
    series_id,
    next_marker = "",
    page_size = 20,
  } = req.body as Partial<{
    type: MediaTypes;
    series_id: string;
    next_marker: string;
    page_size: number;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const where: ModelQuery<"media_profile"> = {};
  if (type) {
    where.type = type;
  }
  if (series_id) {
    where.series_id = series_id;
    const series = await store.prisma.media_series_profile.findFirst({
      where: {
        id: series_id,
      },
    });
    if (!series) {
      const profile_client_res = await MediaProfileClient.New({
        token: user.settings.tmdb_token,
        assets: app.assets,
        store,
      });
      const profile_client = profile_client_res.data;
      if (profile_client) {
        await profile_client.cache_tv_profile({ id: series_id });
      }
    }
  }
  const result = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.media_profile.findMany({
        where,
        include: {
          source_profiles: true,
        },
        orderBy: {
          air_date: "desc",
        },
        ...args,
      });
    },
    page_size,
    next_marker,
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      list: result.list.map((media_profile) => {
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
      next_marker: result.next_marker,
    },
  });
}
