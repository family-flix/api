/**
 * @file 删除播放记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { extra_searched_tv_field } from "@/domains/walker/utils";
import { PartialSearchedTVFromTMDB } from "@/domains/tmdb/services";
import { store } from "@/store";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const body = req.body as PartialSearchedTVFromTMDB;
  if (!id) {
    return e("Missing id");
  }
  const t_resp = parse_token(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const tv_resp = await store.find_tv({ id, user_id });
  if (tv_resp.error) {
    return e(tv_resp);
  }
  if (!tv_resp.data) {
    return e("No matched tv");
  }
  const { searched_tv_id } = body as PartialSearchedTVFromTMDB & {
    searched_tv_id?: string;
  };
  let _searched_tv_id = searched_tv_id;
  if (!searched_tv_id) {
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
    const r2 = await store.add_searched_tv({
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
    _searched_tv_id = r2.data.id;
  }
  const r = await store.update_tv(id, {
    searched_tv_id: _searched_tv_id,
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
