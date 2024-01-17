/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import dayjs from "dayjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, name, alias, source_count, air_date } = req.body as Partial<{
    id: string;
    name: string;
    alias: string;
    source_count: number;
    air_date: number;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少 id"));
  }
  const payload: Partial<{
    name: string;
    alias: string;
    air_date: string;
    source_count: number;
  }> = {};
  if (name) {
    payload.name = name;
  }
  if (alias) {
    payload.alias = alias;
  }
  if (source_count) {
    payload.source_count = source_count;
  }
  if (air_date) {
    payload.air_date = dayjs(air_date).format("YYYY-MM-DD");
  }
  if (Object.keys(payload).length === 0) {
    return e(Result.Err("没有更新字段"));
  }
  const matched = await store.prisma.media_profile.findFirst({
    where: {
      id,
    },
  });
  if (!matched) {
    return e(Result.Err("没有匹配记录"));
  }
  await store.prisma.media_profile.update({
    where: {
      id,
    },
    data: payload,
  });
  res.status(200).json({ code: 0, msg: "更新成功", data: null });
}
