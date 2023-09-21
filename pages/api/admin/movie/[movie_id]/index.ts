/**
 * @file 管理后台/电影详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { movie_id } = req.query as Partial<{ movie_id: string }>;
  if (!movie_id || movie_id === "undefined") {
    return e(Result.Err("缺少电影 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const tv = await store.prisma.movie.findFirst({
    where: {
      id: movie_id,
      user_id,
    },
    include: {
      profile: true,
      parsed_movies: {
        include: {
          drive: true,
        },
      },
    },
  });
  if (tv === null) {
    return e("没有匹配的电影记录");
  }

  const data = (() => {
    const { id, profile, parsed_movies } = tv;
    const { name, original_name, overview, poster_path, backdrop_path, original_language } = profile;
    const sources = parsed_movies;

    return {
      id,
      name: name || original_name,
      overview,
      poster_path,
      backdrop_path,
      original_language,
      tmdb_id: profile.unique_id,
      platform: profile.source,
      profile_platforms: profile.sources,
      sources: sources.map((source) => {
        const { id, file_id, file_name, parent_paths, size, drive } = source;
        return {
          id,
          file_id,
          file_name,
          parent_paths,
          size,
          drive: {
            id: drive.id,
            name: drive.name,
            avatar: drive.avatar,
          },
        };
      }),
    };
  })();

  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
