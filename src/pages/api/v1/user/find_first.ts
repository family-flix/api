/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { ModelQuery } from "@/domains/store/types";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function v1_user_find_first(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { where, include } = req.body as Partial<{ where: ModelQuery<"user">; include: any }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const args = {
    where: {
      ...where,
    },
  };
  if (include && Object.keys(include).length) {
    // @ts-ignore
    args.include = include;
  }
  const r = await store.prisma.user.findFirst(args);
  if (!r) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { id, created, updated } = r;
  const data = {
    id,
    created,
    updated,
  };
  // @ts-ignore
  if (r.settings) {
    // @ts-ignore
    data.settings = r.settings;
  }
  return res.status(200).json({ code: 0, msg: "", data });
}
