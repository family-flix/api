/**
 * @file 获取是否有版本更新
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store } from "@/store/index";
import { Member } from "@/domains/user/member";
import { response_error_factory } from "@/utils/server";
import { compare_versions_with_timestamp } from "@/utils/index";
import { __VERSION__ } from "@/constants/index";
import { BaseApiResp, Result } from "@/types/index";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const headers = req.headers as Partial<{ authorization: string; "client-version": string }>;
  const t_res = await Member.New(headers.authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!headers["client-version"]) {
    return e(Result.Err("版本过旧请点击右上角刷新页面", 800));
  }
  const need_update = compare_versions_with_timestamp(headers["client-version"], __VERSION__);
  if (need_update === -1) {
    return e(Result.Err("版本过旧请更新", 800));
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: null,
  });
}
