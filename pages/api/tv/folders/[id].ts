/**
 * @file 获取指定 tv 下指定 season 的文件夹列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { find_folders_and_recommended_path_in_special_season } from "@/domains/walker/utils";
import { store } from "@/store";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, season = "S01" } = req.query as Partial<{
    id: string;
    season: string;
  }>;
  if (!id) {
    return e("Missing id");
  }
  const t_res = parse_token(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const r = await find_folders_and_recommended_path_in_special_season(
    id,
    season,
    store
  );
  if (r.error) {
    return e(r);
  }
  if (r.data === null) {
    res.status(200).json({ code: 0, msg: "", data: [] });
    return;
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: Object.keys(r.data.episodes).map((paths) => {
      return {
        parent_paths: paths,
        episodes: r.data.episodes[paths],
      };
    }),
  });
}
