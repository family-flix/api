/**
 * @file 分享一个电视剧或电影给好友
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { media_id, target_member_id } = req.body as Partial<{
    media_id: string;
    target_member_id: string;
  }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  if (!media_id) {
    return e(Result.Err("请选择分享的影视剧"));
  }
  if (!target_member_id) {
    return e(Result.Err("请选择分享目标"));
  }
  const valid_token = await store.prisma.member_token.findFirst({
    where: {
      member_id: target_member_id,
    },
  });
  if (!valid_token) {
    return e(Result.Err("成员没有可用的凭证"));
  }
  const existing_media = await store.prisma.media.findFirst({
    where: {
      id: media_id,
      user_id: member.user.id,
    },
    include: {
      profile: true,
    },
  });
  if (!existing_media) {
    return e(Result.Err("没有匹配的记录"));
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      name: existing_media.profile.name,
      original_name: existing_media.profile.original_name,
      poster_path: existing_media.profile.poster_path,
      token: valid_token.id,
    },
  });
}
