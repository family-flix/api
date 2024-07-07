/**
 * @file 根据范围获取剧集列表
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { Media } from "@/domains/media/index";
import { response_error_factory } from "@/utils/server";
import { MediaTypes } from "@/constants/index";
import { Result } from "@/domains/result/index";

export default async function v2_wechat_media_episode(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    media_id,
    next_marker = "",
    page_size = 20,
    start,
    end,
    with_subtitle,
    with_file,
  } = req.body as Partial<{
    media_id: string;
    next_marker: string;
    page_size: number;
    start: number;
    end: number;
    with_subtitle: boolean;
    with_file: boolean;
  }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const r = await Media.Get({ id: media_id, type: MediaTypes.Season, member, store });
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const media = r.data;
  if (start !== undefined && end !== undefined) {
    const r2 = await media.fetch_episodes_by_range({ start, end });
    if (r2.error) {
      return e(Result.Err(r2.error.message));
    }
    const data = {
      list: r2.data,
    };
    return res.status(200).json({ code: 0, msg: "", data });
  }
  const r2 = await media.fetch_episodes_by_next_marker({ next_marker, page_size, with_file, with_subtitle });
  if (r2.error) {
    return e(Result.Err(r2.error.message));
  }
  return res.status(200).json({ code: 0, msg: "", data: r2.data });
}
