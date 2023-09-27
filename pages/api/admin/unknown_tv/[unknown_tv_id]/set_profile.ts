/**
 * @file 修改未识别电视剧文件夹名称，并重新索引
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { TVProfileItemInTMDB } from "@/domains/tmdb/services";
import { User } from "@/domains/user";
import { MediaSearcher } from "@/domains/searcher";
import { Drive } from "@/domains/drive";
import { app, store } from "@/store";
import { response_error_factory } from "@/utils/server";
import { BaseApiResp, Result } from "@/types";
import { Job, TaskTypes } from "@/domains/job";
import { ParsedTVRecord } from "@/domains/store/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { unknown_tv_id: id } = req.query as Partial<{ unknown_tv_id: string }>;
  const { source, unique_id } = req.body as { source: number; unique_id: string };
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  if (!unique_id) {
    return e(Result.Err("缺少电视剧详情 id"));
  }
  const user = t_res.data;
  const parsed_tv = await store.prisma.parsed_tv.findFirst({
    where: {
      id,
      user_id: user.id,
    },
  });
  if (!parsed_tv) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const { drive_id } = parsed_tv;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const search_res = await MediaSearcher.New({
    user,
    drive,
    assets: app.assets,
    store,
    on_print(v) {
      job.output.write(v);
    },
  });
  if (search_res.error) {
    return e(search_res);
  }
  const searcher = search_res.data;
  const job_res = await Job.New({
    unique_id: id,
    desc: "未知电视剧设置详情",
    type: TaskTypes.ChangeTVAndSeasonProfile,
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  async function run(parsed_tv: ParsedTVRecord) {
    const profile_res = await searcher.get_tv_profile_with_tmdb_id({ tmdb_id: Number(unique_id) });
    if (profile_res.error) {
      job.finish();
      return e(profile_res);
    }
    const profile = profile_res.data;
    const r2 = await searcher.link_tv_profile_to_parsed_tv({
      parsed_tv,
      profile,
    });
    if (r2.error) {
      job.finish();
      return e(r2);
    }
    await store.update_parsed_tv(parsed_tv.id, {
      correct_name: profile.name,
    });
    job.finish();
  }
  run(parsed_tv);
  res.status(200).json({
    code: 0,
    msg: "开始关联",
    data: {
      job_id: job.id,
    },
  });
}
