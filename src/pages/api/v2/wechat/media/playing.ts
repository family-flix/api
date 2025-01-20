/**
 * @file 获取季/电影详情加上当前正在播放的剧集信息
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { Media } from "@/domains/media/index";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";
import { MediaTypes } from "@/constants/index";

export default async function v2_wechat_media_playing(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { media_id, type = MediaTypes.Season } = req.body as Partial<{ media_id: string; type: MediaTypes }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const r = await Media.Get({ id: media_id, type, member, store });
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const media = r.data;
  const r2 = await media.fetch_playing_info();
  if (r2.error) {
    return e(Result.Err(r2.error.message));
  }
  const data = r2.data;
  return res.status(200).json({ code: 0, msg: "", data });
}
