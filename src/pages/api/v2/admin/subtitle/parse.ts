/**
 * @file 根据传入的字幕名称，匹配是否有对应的影视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { parse_filename_for_video } from "@/utils/parse_filename_for_video";

export default async function v2_admin_subtitle_parse(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { filenames } = req.body as Partial<{ filenames: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!filenames) {
    return e(Result.Err("缺少字幕文件名"));
  }
  if (filenames.length === 0) {
    return e(Result.Err("缺少字幕文件名"));
  }
  const result: {
    filename: string;
    season_text?: string;
    episode_text?: string;
    language?: string;
  }[] = [];
  const filename_rules = user.get_filename_rules();
  for (let i = 0; i < filenames.length; i += 1) {
    const filename = filenames[i];
    const {
      subtitle_lang,
      episode: episode_text,
      season: season_text,
    } = parse_filename_for_video(filename, ["season", "episode", "subtitle_lang"], filename_rules);
    result.push({
      filename,
      season_text,
      episode_text,
      language: subtitle_lang,
    });
  }
  return res.status(200).json({ code: 0, msg: "", data: result });
}
