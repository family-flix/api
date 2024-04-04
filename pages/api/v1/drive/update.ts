/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store } from "@/store";
import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { ModelQuery } from "@/domains/store/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { where, data } = req.body as Partial<{ where: ModelQuery<"drive">; data: any }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const args = {
    where: {
      ...where,
      user_id: user.id,
    },
    data,
  };
  // @ts-ignore
  const r = await store.prisma.drive.update(args);
  res.status(200).json({ code: 0, msg: "", data: null });
}
