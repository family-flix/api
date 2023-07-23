/**
 * @file 删除 n 天前的 job 中的 log
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { User } from "@/domains/user";
import { store } from "@/store";
import dayjs from "dayjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { n = "7" } = req.query as { n?: string };
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const today = dayjs();
  const target_day = today.subtract(Number(n), "day");
  //   const jobs = await store.prisma.async_task.findMany({
  //     where: {
  //       created: {
  //         lte: target_day.toDate(),
  //       },
  //     },
  //   });
  await store.prisma.output_line.deleteMany({
    where: {
      output: {
        async_task: {
          created: {
            lte: target_day.toDate(),
          },
          user_id: user.id,
        },
      },
    },
  });
  res.status(200).json({ code: 0, msg: "删除成功", data: null });
}
