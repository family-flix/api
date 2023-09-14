/**
 * @file 更新指定 collection 内容
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { ModelKeys, ModelQuery } from "@/domains/store/types";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { parseJSONStr } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const { medias } = req.body as Partial<{
    title: string;
    desc: string;
    sort: number;
    type: number;
    medias: {}[];
    rules: Record<string, unknown>;
    styles: Record<string, unknown>;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少集合 id"));
  }
  const collection = await store.prisma.collection.findFirst({
    where: {
      id,
      user_id: user.id,
    },
  });
  if (!collection) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { rules } = collection;
  const t = parseJSONStr(rules);
  if (t.error) {
    return e(t);
  }
  const { model_name, where } = t.data as Partial<{
    model_name: string;
    where: ModelQuery<"season" | "movie">;
  }>;
  // if (model_name && ["movie", "season"].includes(model_name)) {
  //   const client = store.prisma[model_name as ModelKeys];
  //   const list = await client.findMany({
  //     where: {
  //       ...where,
  //       user_id: user.id,
  //     },
  //   });
  //   await store.prisma.collection.update({
  //     where: {
  //       id: collection.id,
  //     },
  //     data: {
  //       updated: dayjs().toISOString(),
  //     },
  //   });
  // }
  res.status(200).json({ code: 0, msg: "", data: null });
}
