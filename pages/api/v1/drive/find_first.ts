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
  const { where, include } = req.body as Partial<{ where: ModelQuery<"drive">; include: any }>;
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
  };
  if (include) {
    // @ts-ignore
    args.include = include;
  }
  const r = await store.prisma.drive.findFirst(args);
  if (!r) {
    return e(Result.Err("没有匹配的记录"));
  }
  const {
    id,
    type,
    name,
    profile,
    unique_id,
    used_size,
    total_size,
    root_folder_id,
    root_folder_name,
    drive_token_id,
  } = r;
  const data = {
    id,
    unique_id,
    type,
    name,
    profile,
    used_size,
    total_size,
    root_folder_id,
    root_folder_name,
    drive_token_id,
  };
  // @ts-ignore
  if (r.drive_token) {
    // @ts-ignore
    data.drive_token = r.drive_token;
  }
  res.status(200).json({ code: 0, msg: "", data });
}
