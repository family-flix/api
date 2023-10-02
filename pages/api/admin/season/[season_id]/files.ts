/**
 * @file 管理后台/季关联的文件和文件夹
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
  const { season_id } = req.query as Partial<{ season_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!season_id) {
    return e(Result.Err("缺少电视剧季 id"));
  }
  const season = await store.prisma.season.findFirst({
    where: {
      id: season_id,
      user_id: user.id,
    },
    include: {
      _count: true,
      profile: true,
      parsed_episodes: {
        include: {
          drive: true,
        },
      },
      tv: {
        include: {
          profile: true,
        },
      },
    },
  });
  if (season === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const data = await (async () => {
    const { name, original_name, overview, backdrop_path, poster_path, original_language, first_air_date, unique_id } =
      season.tv.profile;
    return {
      id: season_id,
      name: name || original_name,
      overview,
      poster_path: poster_path || season.profile.poster_path,
      backdrop_path,
      original_language,
      first_air_date,
    };
  })();

  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
