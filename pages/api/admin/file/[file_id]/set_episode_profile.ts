/**
 * @file 指定该文件是什么剧集
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store";
import { User } from "@/domains/user";
import { Job, TaskTypes } from "@/domains/job";
import { FileRecord } from "@/domains/store/types";
import { MediaSearcher } from "@/domains/searcher";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { Drive } from "@/domains/drive";
import { FileType } from "@/constants";
import { padding_zero, r_id } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id } = req.query as Partial<{ file_id: string }>;
  const { source, unique_id, season_number, episode_number } = req.body as Partial<{
    source: number;
    unique_id: string;
    season_number: number;
    episode_number: number;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!file_id) {
    return e(Result.Err("缺少文件 file_id"));
  }
  if (!unique_id) {
    return e(Result.Err("缺少电视剧详情 id"));
  }
  if (!season_number) {
    return e(Result.Err("缺少电视剧季数"));
  }
  if (!episode_number) {
    return e(Result.Err("缺少电视剧剧集数"));
  }
  const file = await store.prisma.file.findFirst({
    where: {
      file_id,
      user_id: user.id,
    },
  });
  if (!file) {
    return e(Result.Err("没有匹配的记录"));
  }
  if (file.type !== FileType.File) {
    return e(Result.Err("只有文件可以关联剧集"));
  }
  const drive_res = await Drive.Get({ id: file.drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const searcher_res = await MediaSearcher.New({
    user,
    store,
    assets: app.assets,
    on_print(v) {
      job.output.write(v);
    },
  });
  if (searcher_res.error) {
    return e(searcher_res);
  }
  const job_res = await Job.New({
    unique_id: "update_movie_and_season",
    desc: `文件[${file.name}]设置剧集详情`,
    type: TaskTypes.RefreshMedia,
    user_id: user.id,
    app,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  const searcher = searcher_res.data;
  async function run(file: FileRecord, payload: { unique_id: string; season_number: number; episode_number: number }) {
    const { unique_id, season_number, episode_number } = payload;
    const tv_profile_res = await searcher.get_tv_profile_with_tmdb_id({ tmdb_id: Number(unique_id) });
    if (tv_profile_res.error) {
      job.output.write_line(["获取电视剧详情失败", tv_profile_res.error.message]);
      job.finish();
      return;
    }
    const parsed_movie = await store.prisma.parsed_movie.findFirst({
      where: {
        file_id: file.file_id,
        user_id: user.id,
      },
    });
    if (parsed_movie) {
      await store.prisma.parsed_movie.delete({ where: { id: parsed_movie.id } });
    }
    const tv_profile = tv_profile_res.data;
    const season_profile_res = await searcher.client.fetch_partial_season_profile({
      tv_id: Number(unique_id),
      season_number: season_number,
    });
    if (season_profile_res.error) {
      job.output.write_line(["获取电视剧季详情失败", season_profile_res.error.message]);
      job.finish();
      return;
    }
    if (season_profile_res.data === null) {
      job.output.write_line(["获取电视剧季详情失败，没有匹配的季"]);
      job.finish();
      return;
    }
    const season_profile = await (async () => {
      const existing = await store.prisma.season_profile.findFirst({
        where: {
          unique_id: String(season_profile_res.data.id),
        },
      });
      if (existing) {
        return existing;
      }
      const body = await searcher.normalize_season_profile(season_profile_res.data);
      const payload = {
        id: r_id(),
        ...body,
      };
      const created = await store.prisma.season_profile.create({
        data: payload,
      });
      return created;
    })();
    const episode_profile_res = await searcher.client.fetch_episode_profile({
      tv_id: Number(unique_id),
      season_number: season_number,
      episode_number: episode_number,
    });
    if (episode_profile_res.error) {
      job.output.write_line(["获取电视剧剧集详情失败", episode_profile_res.error.message]);
      job.finish();
      return;
    }
    if (episode_profile_res.data === null) {
      job.output.write_line(["获取电视剧剧集详情失败，没有匹配的剧集"]);
      job.finish();
      return;
    }
    const episode_profile = await (async () => {
      const existing = await store.prisma.episode_profile.findFirst({
        where: {
          unique_id: String(episode_profile_res.data.id),
        },
      });
      if (existing) {
        return existing;
      }
      const body = await searcher.normalize_episode_profile(episode_profile_res.data);
      const payload = {
        id: r_id(),
        ...body,
      };
      const created = await store.prisma.episode_profile.create({
        data: payload,
      });
      return created;
    })();
    const tv = await (async () => {
      const ex = await store.prisma.tv.findFirst({
        where: {
          profile_id: tv_profile.id,
          user_id: user.id,
        },
      });
      if (ex) {
        return ex;
      }
      return store.prisma.tv.create({
        data: {
          id: r_id(),
          profile_id: tv_profile.id,
          user_id: user.id,
        },
      });
    })();
    const season = await (async () => {
      const ex = await store.prisma.season.findFirst({
        where: {
          profile_id: season_profile.id,
          tv_id: tv.id,
          user_id: user.id,
        },
      });
      if (ex) {
        return ex;
      }
      return store.prisma.season.create({
        data: {
          id: r_id(),
          season_number: season_profile.season_number || 0,
          season_text: `S${padding_zero(season_profile.season_number || 0)}`,
          profile_id: season_profile.id,
          tv_id: tv.id,
          user_id: user.id,
        },
      });
    })();
    const episode = await (async () => {
      const ex = await store.prisma.episode.findFirst({
        where: {
          profile_id: episode_profile.id,
          tv_id: tv.id,
          season_id: season.id,
          user_id: user.id,
        },
      });
      if (ex) {
        return ex;
      }
      return store.prisma.episode.create({
        data: {
          id: r_id(),
          season_text: `S${padding_zero(season_profile.season_number || 0)}`,
          episode_text: `E${padding_zero(episode_profile.episode_number || 0)}`,
          episode_number: episode_profile.episode_number || 0,
          profile_id: episode_profile.id,
          tv_id: tv.id,
          season_id: season.id,
          user_id: user.id,
        },
      });
    })();
    const maybe_same_parsed_tv = await (async () => {
      const ex = await store.prisma.parsed_tv.findFirst({
        where: {
          file_name: file.parent_paths.split("/").pop() || drive.profile.root_folder_name!,
          unique_id: String(tv_profile.unique_id),
          tv_id: tv.id,
          user_id: user.id,
          drive_id: drive.id,
        },
      });
      if (ex) {
        return ex;
      }
      const created = await store.prisma.parsed_tv.create({
        data: {
          id: r_id(),
          file_name: file.parent_paths.split("/").pop() || drive.profile.root_folder_name!,
          unique_id: String(tv_profile.unique_id),
          tv_id: tv.id,
          user_id: user.id,
          drive_id: drive.id,
        },
      });
      return created;
    })();
    const existing = await store.prisma.parsed_episode.findFirst({
      where: {
        file_id: file.file_id,
        user_id: user.id,
      },
    });
    if (existing) {
      job.output.write_line(["该文件已有剧集解析结果，更新已存在的解析结果"]);
      await store.prisma.parsed_episode.update({
        where: {
          id: existing.id,
        },
        data: {
          episode_id: episode.id,
          season_id: season.id,
          parsed_tv_id: maybe_same_parsed_tv.id,
        },
      });
      job.finish();
      return;
    }
    job.output.write_line(["创建剧集解析结果"]);
    await store.prisma.parsed_episode.create({
      data: {
        id: r_id(),
        name: file.name,
        file_name: file.name,
        file_id: file.file_id,
        episode_number: `E${padding_zero(episode_number)}`,
        season_number: `E${padding_zero(season_number)}`,
        size: file.size,
        md5: file.md5,
        parent_file_id: file.parent_file_id,
        parent_paths: file.parent_paths,
        episode_id: episode.id,
        season_id: season.id,
        parsed_tv_id: maybe_same_parsed_tv.id,
        type: file.type,
        user_id: user.id,
        drive_id: drive.id,
      },
    });
    job.finish();
  }
  run(file, { unique_id, season_number, episode_number });
  res.status(200).json({ code: 0, msg: "设置剧集详情", data: { job_id: job.id } });
}
