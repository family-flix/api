/**
 * @file 给未识别的文件夹绑定一个 tv 记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { extra_searched_tv_field, upload_tmdb_images } from "@/domains/walker/utils";
import { PartialSearchedTVFromTMDB } from "@/domains/tmdb/services";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const body = req.body as PartialSearchedTVFromTMDB;
  if (!id) {
    return e("缺少未识别文件夹 id");
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
    return e("没有匹配的文件夹记录");
  }
  // const unknown_tv = tv_resp.data;
  // if (unknown_tv.tv_profile_id) {
  //   return e("该电视剧已有匹配的电视剧信息");
  // }
  const { id: tmdb_id } = body as PartialSearchedTVFromTMDB & {
    id?: string;
  };
  const tv_profile_res = await (async () => {
    const existing_res = await store.find_tv_profile({ tmdb_id });
    if (existing_res.error) {
      return Result.Err(existing_res.error);
    }
    if (!existing_res.data) {
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
      const payload = {
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
      };
      const r2 = await store.add_tv_profile(payload);
      if (r2.error) {
        return Result.Err(r2.error);
      }
      return Result.Ok(r2.data);
    }
    return Result.Ok(existing_res.data);
  })();
  if (tv_profile_res.error) {
    return e(tv_profile_res);
  }
  const searched_tv = tv_profile_res.data;
  const duplicated_tv_res = await store.find_tv({
    profile_id: searched_tv.id,
  });
  if (duplicated_tv_res.error) {
    return e(duplicated_tv_res);
  }
  if (duplicated_tv_res.data) {
    const r = await store.update_parsed_tv(id, {
      tv_id: duplicated_tv_res.data.id,
    });
    if (r.error) {
      return e(r);
    }
    res.status(200).json({ code: 0, msg: "", data: null });
    return;
  }
  const r = await store.add_tv({
    profile_id: searched_tv.id,
    user_id,
  });
  if (r.error) {
    return e(r);
  }
  const r2 = await store.update_parsed_tv(id, {
    tv_id: r.data.id,
  });
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
