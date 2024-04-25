/**
 * @file 获取和该电视剧季/电影同一系列的其他电视剧季/电影
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { MediaTypes } from "@/constants/index";

export default async function v2_wechat_media_series(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    media_id,
    page_size = 20,
    next_marker = "",
  } = req.body as Partial<{
    media_id: string;
    page_size: number;
    next_marker: string;
  }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  if (!media_id) {
    return e(Result.Err("缺少电视剧季 id"));
  }
  const season = await store.prisma.media.findFirst({
    where: {
      id: media_id,
      type: MediaTypes.Season,
      user_id: member.user.id,
    },
    include: {
      profile: {
        include: {
          series: true,
        },
      },
    },
  });
  if (season === null) {
    return e(Result.Err("没有匹配的记录"));
  }
  const result = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.media.findMany({
        where: {
          NOT: {
            id: season.id,
          },
          profile: {
            series_id: season.profile.series_id,
          },
          user_id: member.user.id,
        },
        include: {
          profile: true,
        },
        ...args,
      });
    },
    page_size,
    next_marker,
  });
  const data = {
    list: result.list.map((s) => {
      const { id, profile } = s;
      const { name, poster_path } = profile;
      return {
        id,
        name,
        poster_path,
      };
    }),
    next_marker: result.next_marker,
  };
  return res.status(200).json({ code: 0, msg: "", data });
}
