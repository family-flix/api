/**
 * @file 获取该任务详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory, analysis_tv } from "@/utils/backend";
import { store } from "@/store";

const { find_async_task, find_searched_tv, find_tmp_tvs, find_tmp_episodes } =
  store;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { query } = req;
  const { id: task_id } = query as Partial<{ id: string }>;
  const r1 = await find_async_task({ id: task_id });
  if (r1.error) {
    return e(r1);
  }
  if (!r1.data) {
    return e("No matched async_task");
  }
  const { unique_id, status, desc } = r1.data;
  if (status === "Running") {
    return r1;
  }
  if (unique_id.match(/\.aliyundrive\.com\/s\/[a-zA-Z0-9]{1,}/)) {
    const tvs_resp = await find_tmp_tvs({
      async_task_id: task_id,
    });
    if (tvs_resp.error) {
      return e(tvs_resp);
    }
    const results = [];
    for (let i = 0; i < tvs_resp.data.length; i += 1) {
      const tv = tvs_resp.data[i];
      const { id: tv_id, name, original_name, searched_tv_id } = tv;
      const r: {
        id: string;
        name: string;
        original_name: string;
        // 未识别的 tv 不会有 overview 和 poster_path
        overview?: string;
        poster_path?: string;
        seasons: {}[];
      } = {
        id: tv_id,
        name,
        original_name,
        seasons: [],
      };
      let extra_tv_profile: Partial<{
        name: string;
        original_name: string;
        overview: string;
        poster_path: string;
      }> = {};
      if (searched_tv_id) {
        const searched_tv = await find_searched_tv({ id: searched_tv_id });
        if (searched_tv.data) {
          const { name, original_name, overview, poster_path } =
            searched_tv.data;
          extra_tv_profile.name = name;
          extra_tv_profile.original_name = original_name;
          extra_tv_profile.overview = overview;
          extra_tv_profile.poster_path = poster_path;
        }
      }
      const episodes_resp = await find_tmp_episodes(
        { tv_id },
        { sorts: [{ key: "episode", order: "ASC" }] }
      );
      if (episodes_resp.error) {
        results.push(r);
        continue;
      }
      const {
        name: n,
        original_name: o_n,
        poster_path,
        backdrop_path,
        folder_id,
        in_same_root_folder,
        size_count,
        seasons,
      } = analysis_tv({ ...tv, ...extra_tv_profile }, [], episodes_resp.data);
      results.push({
        name: n,
        original_name: o_n,
        poster_path,
        backdrop_path,
        folder_id,
        in_same_root_folder,
        size_count,
        seasons,
      });
    }
    return res.status(200).json({
      code: 0,
      msg: "",
      data: {
        id: task_id,
        desc,
        list: results,
      },
    });
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
