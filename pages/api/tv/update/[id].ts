/**
 * @file 更新未知电视剧详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { TVProfileFromTMDB } from "@/domains/tmdb/services";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  // const e = response_error_factory(res);
  // const { authorization } = req.headers;
  // const { id } = req.query as Partial<{ id: string }>;
  // const { tv_profile_id } = req.body as TVProfileFromTMDB & {
  //   tv_profile_id?: string;
  // };
  // if (!id) {
  //   return e("Missing id");
  // }
  // const t_resp = await User.New(authorization);
  // if (t_resp.error) {
  //   return e(t_resp);
  // }
  // const { id: user_id } = t_resp.data;
  // const tv_resp = await store.find_parsed_tv({ id, user_id });
  // if (tv_resp.error) {
  //   return e(tv_resp);
  // }
  // if (!tv_resp.data) {
  //   return e("No matched tv");
  // }
  // let _tv_profile_id = tv_profile_id;
  // if (!tv_profile_id) {
  //   const {
  //     tmdb_id,
  //     name,
  //     original_name,
  //     overview,
  //     poster_path,
  //     backdrop_path,
  //     first_air_date,
  //     vote_average,
  //     vote_count,
  //     popularity,
  //     original_language,
  //     number_of_episodes,
  //     number_of_seasons,
  //   } = body;
  //   const r2 = await store.add_tv_profile({
  //     tmdb_id,
  //     name,
  //     original_name,
  //     overview,
  //     poster_path,
  //     backdrop_path,
  //     first_air_date,
  //     vote_average,
  //     vote_count,
  //     popularity,
  //     original_language,
  //     episode_count: number_of_episodes,
  //     season_count: number_of_seasons,
  //   });
  //   if (r2.error) {
  //     return e(r2);
  //   }
  //   _tv_profile_id = r2.data.id;
  // }
  // const r = await store.update_parsed_tv(id, {
  //   tv_profile_id: _tv_profile_id,
  // });
  // if (r.error) {
  //   return e(r);
  // }
  res.status(200).json({ code: 0, msg: "", data: null });
}
