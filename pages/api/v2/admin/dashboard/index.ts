/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Administrator } from "@/domains/administrator";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { bytes_to_size } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_res = await Administrator.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const {
    drive_count,
    drive_total_size_count,
    drive_used_size_count,
    movie_count,
    season_count,
    episode_count,
    sync_task_count,
    report_count,
    media_request_count,
    invalid_movie_count,
    invalid_season_count,
    invalid_sync_task_count,
    updated_at,
  } = user.statistics;
  const data = {
    drive_count,
    drive_total_size_count,
    drive_total_size_count_text: bytes_to_size(drive_total_size_count),
    drive_used_size_count,
    drive_used_size_count_text: bytes_to_size(drive_used_size_count),
    movie_count,
    season_count,
    episode_count,
    sync_task_count,
    report_count,
    media_request_count,
    invalid_movie_count,
    invalid_season_count,
    invalid_sync_task_count,
    updated_at,
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
