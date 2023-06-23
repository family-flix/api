/**
 * @file 管理后台/电影详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id || id === "undefined") {
    return e("缺少电影 id");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const tv = await store.prisma.movie.findFirst({
    where: {
      id,
      user_id,
    },
    include: {
      profile: true,
      parsed_movies: true,
    },
  });
  if (tv === null) {
    return e("没有匹配的电视剧记录");
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
      sources,
    };
  })();

  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
