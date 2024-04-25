/**
 * @file 管理后台/获取解析出的剧集详情
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
  const { parsed_tv_id: id } = req.body as Partial<{ parsed_tv_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  const parsed_tv = await store.prisma.parsed_tv.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      tv: {
        include: {
          profile: true,
        },
      },
    },
  });
  if (parsed_tv === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const { name, file_name, tv } = parsed_tv;
  const data = {
    id,
    name,
    file_name,
    profile: tv
      ? {
          name: tv.profile.name,
          original_name: tv.profile.original_name,
          poster_path: tv.profile.poster_path,
          overview: tv.profile.overview,
        }
      : null,
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
