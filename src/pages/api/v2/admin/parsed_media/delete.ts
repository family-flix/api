/**
 * @file 管理后台/删除指定电视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_admin_parsed_media_delete(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: parsed_media_id } = req.body as Partial<{ id: string }>;
  const t = await User.New(authorization, store);
  if (t.error) {
    return e(t);
  }
  const user = t.data;
  if (!parsed_media_id) {
    return e(Result.Err("缺少未识别电视剧 id"));
  }
  const parsed_media = await store.prisma.parsed_media.findFirst({
    where: {
      id: parsed_media_id,
      user_id: user.id,
    },
  });
  if (parsed_media === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  await store.prisma.parsed_media_source.deleteMany({
    where: {
      parsed_media_id: parsed_media.id,
      user_id: user.id,
    },
  });
  await store.prisma.parsed_media.delete({
    where: {
      id: parsed_media.id,
    },
  });
  return res.status(200).json({
    code: 0,
    msg: "删除成功",
    data: null,
  });
}
