/**
 * @file 查看指定成员的播放列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { ModelQuery } from "@/domains/store/types";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_member_histories(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    member_id,
    next_marker = "",
    page_size,
  } = req.body as Partial<{
    member_id: string;
    next_marker: string;
    page_size: number;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const where: ModelQuery<"play_history_v2"> = {
    member: {
      id: member_id,
      user_id: user.id,
    },
  };
  const result = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.play_history_v2.findMany({
        where,
        include: {
          media: {
            include: {
              profile: true,
            },
          },
          media_source: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          updated: "desc",
        },
        ...args,
      });
    },
    page_size,
    next_marker,
  });
  const data = {
    next_marker: result.next_marker,
    list: result.list.map((history) => {
      const { id, current_time, duration, media, media_source, updated } = history;
      return {
        id,
        current_time,
        duration,
        name: media.profile.name,
        poster_path: media.profile.poster_path,
        type: media.profile.type,
        source: media_source.profile.name,
        updated,
      };
    }),
  };
  return res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
