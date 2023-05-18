/**
 * @file 更新未知电视剧详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { extra_searched_tv_field } from "@/domains/walker/utils";
import { PartialTVProfile } from "@/domains/tmdb/services";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const body = req.body as PartialTVProfile;
  if (!id) {
    return e("Missing id");
  }
  const t_resp = await User.New(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const tv_resp = await store.find_parsed_tv({ id, user_id });
  if (tv_resp.error) {
    return e(tv_resp);
  }
  if (!tv_resp.data) {
    return e("No matched tv");
  }
  const { tv_profile_id } = body as PartialTVProfile & {
    tv_profile_id?: string;
  };
  let _tv_profile_id = tv_profile_id;
  if (!tv_profile_id) {
    const {
      tmdb_id,
      name,
      original_name,
      overview,
      poster_path,
      backdrop_path,
      first_air_date,
      vote_average,
      vote_count,
      popularity,
      original_language,
    } = extra_searched_tv_field(body);
    const r2 = await store.add_tv_profile({
      tmdb_id,
      name,
      original_name,
      overview,
      poster_path,
      backdrop_path,
      first_air_date,
      vote_average,
      vote_count,
      popularity,
      original_language,
    });
    if (r2.error) {
      return e(r2);
    }
    _tv_profile_id = r2.data.id;
  }
  const r = await store.update_parsed_tv(id, {
    tv_profile_id: _tv_profile_id,
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
