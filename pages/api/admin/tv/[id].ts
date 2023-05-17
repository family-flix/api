/**
 * @file 管理后台/电视剧详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("Missing tv_id");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const tv_res = await store.find_parsed_tv({ id, user_id });
  if (tv_res.error) {
    return e(tv_res);
  }
  if (!tv_res.data) {
    return e("No matched record of tv");
  }
  const searched_tv_res = await store.find_tv_profile({
    id: tv_res.data.tv_profile_id || undefined,
  });
  if (searched_tv_res.error) {
    return e(searched_tv_res);
  }
  const tv = tv_res.data;
  const profile = searched_tv_res.data;
  const episodes_res = await store.find_episodes(
    { tv_id: id, user_id },
    {
      sorts: [
        {
          key: "episode",
          order: "DESC",
        },
      ],
    }
  );
  if (episodes_res.error) {
    return e(episodes_res);
  }
  const episodes = episodes_res.data;
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      ...tv,
      ...profile,
      episodes,
    },
  });
}
