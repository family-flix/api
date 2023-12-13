/**
 * @file 获取电影部分信息
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery, SeasonProfileWhereInput } from "@/domains/store/types";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { movie_id } = req.query as Partial<{
    movie_id: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!movie_id) {
    return e(Result.Err("缺少电影 id"));
  }
  let queries: SeasonProfileWhereInput[] = [];
  const where: ModelQuery<"movie"> = {
    id: movie_id,
    user_id: user.id,
  };
  if (queries.length !== 0) {
    where.profile = {
      AND: queries,
    };
  }
  const movie = await store.prisma.movie.findFirst({
    where,
    include: {
      profile: true,
      parsed_movies: {
        include: {
          drive: true,
        },
      },
    },
    orderBy: {
      profile: { air_date: "asc" },
    },
  });
  if (!movie) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { id, profile, parsed_movies } = movie;
  const { name, original_name, air_date } = profile;
  const sources = parsed_movies.map((source) => {
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
        type: drive.type,
      },
    };
  });
  const data = {
    id,
    name: name || original_name,
    original_name,
    poster_path: profile.poster_path,
    first_air_date: air_date,
    medias: [
      {
        id,
        name: name || original_name,
        sources,
      },
    ],
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
