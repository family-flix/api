/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { bytes_to_size } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const record = await store.prisma.statistics.findFirst({
    where: {
      user_id: user.id,
    },
  });
  if (!record) {
    res.status(200).json({
      code: 0,
      msg: "",
      data: {
        drive_count: "0",
        drive_total_size_count: "0",
        drive_used_size_count: "0",
        movie_count: "0",
        tv_count: "0",
        season_count: "0",
        episode_count: "0",
        sync_task_count: "0",
        report_count: "0",
        media_request_count: "0",
        invalid_season_count: "0",
        invalid_sync_task_count: "0",
      },
    });
    return;
  }
  const {
    drive_count,
    drive_total_size_count,
    drive_used_size_count,
    movie_count,
    tv_count,
    season_count,
    episode_count,
    sync_task_count,
    report_count,
    media_request_count,
    invalid_season_count,
    invalid_sync_task_count,
  } = record;
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      drive_count,
      drive_total_size_count,
      drive_total_size_count_text: bytes_to_size(Number(drive_total_size_count)),
      drive_used_size_count,
      drive_used_size_count_text: bytes_to_size(Number(drive_used_size_count)),
      movie_count,
      tv_count,
      season_count,
      episode_count,
      sync_task_count,
      report_count,
      media_request_count,
      invalid_season_count,
      invalid_sync_task_count,
    },
  });
}
