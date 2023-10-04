/**
 * @file 管理后台/归档指定文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { Job, TaskTypes } from "@/domains/job";
import { FileRecord, ParsedEpisodeRecord, ParsedTVRecord } from "@/domains/store/types";
import { archive_season_files } from "@/domains/aliyundrive/utils";
import { MediaSearcher } from "@/domains/searcher";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";
import { Folder } from "@/domains/folder";
import { Drive } from "@/domains/drive";
import { FileType } from "@/constants";
import { DriveAnalysis } from "@/domains/analysis";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id, drive_id } = req.query as Partial<{ file_id: string; drive_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!file_id) {
    return e(Result.Err("缺少文件 file_id"));
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
    return e(Result.Err("该操作仅限文件"));
  }
  const parsed_episode = await store.prisma.parsed_episode.findFirst({
    where: {
      file_id,
      user_id: user.id,
    },
    include: {
      episode: {
        include: {
          tv: {
            include: {
              profile: true,
            },
          },
          season: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });
  if (!parsed_episode) {
    return e(Result.Err("该文件没有关联剧集解析结果"));
  }
  if (!parsed_episode.episode) {
    return e(Result.Err("没有匹配的剧集信息"));
  }
  const { name, original_name } = parsed_episode.episode.tv.profile;
  const { season_text } = parsed_episode.episode.season;
  const { air_date } = parsed_episode.episode.season.profile;
  const n = name || original_name;
  if (!n) {
    return e(Result.Err("剧集信息缺少名称"));
  }
  const payload = {
    parsed_episode,
    name: n,
    original_name,
    season_text,
    air_date,
  };
  const job_res = await Job.New({
    unique_id: file.id,
    desc: `文件[${file.name}]归档`,
    type: TaskTypes.ArchiveSeason,
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  const drive_res = await Drive.Get({ id: file.drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  async function run(payload: {
    parsed_episode: ParsedEpisodeRecord;
    name: string;
    original_name: string | null;
    season_text: string;
    air_date: string | null;
  }) {
    const { parsed_episode } = payload;
    const { id, file_id, name, episode_number, season_number, parent_file_id, parent_paths } = parsed_episode;
    const created_folder_res = await archive_season_files({
      profile: payload,
      files: [
        {
          id,
          file_id,
          file_name: name,
          type: FileType.File,
          episode_number,
          season_number,
          parent_file_id,
          parent_paths,
        },
      ],
      job,
      drive,
      user,
      store,
    });
    if (created_folder_res.error) {
      job.output.write_line(["归档失败，因为", created_folder_res.error.message]);
      job.finish();
      return;
    }
    const created_folder = created_folder_res.data;
    const analysis_res = await DriveAnalysis.New({
      drive,
      user,
      store,
      assets: app.assets,
      on_print(v) {
        job.output.write(v);
      },
    });
    if (analysis_res.error) {
      job.output.write_line(["初始化索引，因为", analysis_res.error.message]);
      job.finish();
      return;
    }
    const analysis = analysis_res.data;
    await analysis.run([
      {
        name: [drive.profile.root_folder_name, created_folder.file_name].join("/"),
        type: "folder",
      },
    ]);
    job.output.write_line(["完成归档"]);
    job.finish();
  }
  run(payload);
  res.status(200).json({ code: 0, msg: "变更电视剧详情", data: { job_id: job.id } });
}
