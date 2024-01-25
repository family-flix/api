/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { Statistics } from "@/domains/store/types";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { parseJSONStr } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const rr = await (async () => {
    const r = await store.prisma.statistics.findFirst({
      where: {
        user_id: user.id,
      },
    });
    if (!r) {
      // return {
      //   drive_count: "0",
      //   drive_total_size_count: "0",
      //   drive_used_size_count: "0",
      //   movie_count: "0",
      //   tv_count: "0",
      //   season_count: "0",
      //   episode_count: "0",
      //   sync_task_count: "0",
      //   report_count: "0",
      //   media_request_count: "0",
      //   invalid_season_count: "0",
      //   invalid_sync_task_count: "0",
      //   updated: null,
      // };
      return Result.Err("没有匹配的记录");
    }
    const data = parseJSONStr<Statistics>(r.data);
    if (data.error) {
      return Result.Err("数据解析失败");
    }
    return Result.Ok({
      ...data.data,
      updated: dayjs(r.updated).format("YYYY-MM-DD MM:HH:ss"),
    });
  })();
  if (rr.error) {
    return e(rr.error.message);
  }
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
    invalid_season_count,
    invalid_sync_task_count,
    updated,
  } = rr.data;
  // const data = {
  //   drive_count,
  //   drive_total_size_count,
  //   drive_total_size_count_text: bytes_to_size(Number(drive_total_size_count)),
  //   drive_used_size_count,
  //   drive_used_size_count_text: bytes_to_size(Number(drive_used_size_count)),
  //   movie_count,
  //   tv_count,
  //   season_count,
  //   episode_count,
  //   sync_task_count,
  //   report_count,
  //   media_request_count,
  //   invalid_season_count,
  //   invalid_sync_task_count,
  //   updated_at: updated,
  // };
  res.status(200).json({
    code: 0,
    msg: "",
    data: rr.data,
  });
}
