/**
 * @file 给指定 tv 绑定一个 tmdb 的搜索结果
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import {
  extra_searched_tv_field,
  upload_tmdb_images,
} from "@/domains/walker/utils";
import { PartialSearchedTVFromTMDB } from "@/domains/tmdb/services";
import { store } from "@/store";
import { User } from "@/domains/user";

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
  const t_resp = await User.New(authorization);
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
  const { id: tmdb_id } = body as PartialSearchedTVFromTMDB & {
    id?: string;
  };
  let _searched_tv_id = tmdb_id;
  const existing_res = await store.find_searched_tv({ tmdb_id });
  if (existing_res.error) {
    return e(existing_res);
  }
  if (existing_res.data) {
    const r = await store.update_tv(id, {
      searched_tv_id: existing_res.data.id,
      correct_name: existing_res.data.name,
    });
    if (r.error) {
      return e(r);
    }
    return res.status(200).json({ code: 0, msg: "", data: null });
  }
  const {
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
    ...(await upload_tmdb_images({
      tmdb_id,
      poster_path,
      backdrop_path,
    })),
    first_air_date,
    vote_average,
    vote_count,
    popularity,
    original_language,
  });
  if (r2.error) {
    return e(r2);
  }
  const r = await store.update_tv(id, {
    searched_tv_id: r2.data.id,
    correct_name: name,
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
