/**
 * @file 删除 n 天前的 job 中的 log
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { n = "7" } = req.query as { n?: string };
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (Number(n) < 3) {
    return e(Result.Err("不能删除近三天内的"));
  }
  const today = dayjs();
  const target_day = today.subtract(Number(n), "day").toDate();
  // const count = await store.prisma.output_line.count({
  //   where: {
  //     created: {
  //       lte: target_day,
  //     },
  //   },
  // });
  await store.prisma.output_line.deleteMany({
    where: {
      created: {
        lte: target_day,
      },
    },
  });
  res.status(200).json({ code: 0, msg: "开始删除", data: null });
}
