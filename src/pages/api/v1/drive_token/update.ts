/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { ModelQuery } from "@/domains/store/types";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";

export default async function v1_drive_token_update(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { where, data } = req.body as Partial<{ where: ModelQuery<"drive">; data: any }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!where || !where.id) {
    return e(Result.Err("缺少 id 参数"));
  }
  const args = {
    where: {
      id: where.id,
    },
    data,
  };
  // @ts-ignore
  const r = await store.prisma.drive_token.update(args);
  return res.status(200).json({ code: 0, msg: "", data: null });
}
