/**
 * @file TMDB 搜索影视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { TMDBClient } from "@/domains/media_profile/tmdb";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { MediaTypes } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    keyword,
    page = 1,
    page_size = 20,
    token,
    type,
  } = req.body as Partial<{
    keyword: string;
    page: number;
    page_size: number;
    token?: string;
    /** 搜索电视剧1 还是电影2 */
    type?: MediaTypes;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!keyword) {
    return e(Result.Err("缺少搜索关键字"));
  }
  if (!type) {
    return e(Result.Err("请指定搜索电视剧还是电影"));
  }
  const user = t_res.data;
  const tmdb = new TMDBClient({
    token: token || user.settings.tmdb_token,
  });
  const r = await (async () => {
    if (type === MediaTypes.Season) {
      const r = await tmdb.search_tv(keyword, { page });
      if (r.error) {
        return Result.Err(r.error.message);
      }
      const { total, list } = r.data;
      return Result.Ok({
        total,
        list: list.map((media) => {
          return {
            ...media,
            air_date: media.first_air_date,
            type: MediaTypes.Season,
          };
        }),
      });
    }
    if (type === MediaTypes.Movie) {
      const r = await tmdb.search_movie(keyword, { page });
      if (r.error) {
        return Result.Err(r.error.message);
      }
      const { total, list } = r.data;
      return Result.Ok({
        total,
        list: list.map((media) => {
          return {
            ...media,
            type: MediaTypes.Movie,
          };
        }),
      });
    }
    return Result.Err("未知的 type 值");
  })();
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const { total, list } = r.data;
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      no_more: page * page_size >= total,
      list,
    },
  });
}
