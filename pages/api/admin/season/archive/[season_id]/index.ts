/**
 * @file 获取待归档的季列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { EpisodeRecord, ModelQuery, ParsedEpisodeRecord, SeasonProfileWhereInput } from "@/domains/store/types";
import { archive_season_files, TheFilePrepareTransfer } from "@/domains/aliyundrive/utils";
import { Job, TaskTypes } from "@/domains/job";
import { Drive } from "@/domains/drive";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { FileType } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { season_id } = req.query as Partial<{
    season_id: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!season_id) {
    return e(Result.Err("缺少季 id"));
  }
  let queries: SeasonProfileWhereInput[] = [];
  const where: ModelQuery<"season"> = {
    id: season_id,
    user_id: user.id,
  };
  if (queries.length !== 0) {
    where.profile = {
      AND: queries,
    };
  }
  const season = await store.prisma.season.findFirst({
    where,
    include: {
      profile: true,
      tv: {
        include: {
          profile: true,
        },
      },
      episodes: {
        include: {
          parsed_episodes: true,
        },
      },
    },
  });
  if (!season) {
    return e(Result.Err("没有匹配的记录"));
  }
  const { season_text, tv, episodes } = season;
  const all_parsed_episodes_of_the_season = episodes.reduce((total, cur) => {
    const { episode_text, season_text } = cur;
    return total.concat(
      cur.parsed_episodes.map((parsed_episode) => {
        return {
          ...parsed_episode,
          episode_number: episode_text,
          season_number: season_text,
        };
      })
    );
  }, [] as ParsedEpisodeRecord[]);
  const parsed_episode_groups_by_drive_id: Record<string, TheFilePrepareTransfer[]> = {};
  for (let i = 0; i < all_parsed_episodes_of_the_season.length; i += 1) {
    const parsed_episode = all_parsed_episodes_of_the_season[i];
    const { id, file_id, file_name, parent_paths, parent_file_id, episode_number, season_number, drive_id } =
      parsed_episode;
    const payload = {
      id,
      file_id,
      file_name,
      parent_file_id,
      parent_paths,
      type: FileType.File,
      episode_number,
      season_number,
    };
    parsed_episode_groups_by_drive_id[drive_id] = parsed_episode_groups_by_drive_id[drive_id] || [];
    parsed_episode_groups_by_drive_id[drive_id].push(payload);
  }
  const drive_ids = Object.keys(parsed_episode_groups_by_drive_id);
  if (drive_ids.length === 0) {
    return e(Result.Err("没有找到云盘"));
  }
  if (drive_ids.length !== 1) {
    return e(Result.Err("同一季剧集存在不同云盘中，无法归档"));
  }
  const drive_id = drive_ids[0];
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const { name, original_name } = tv.profile;
  const tv_name = name || original_name;
  const job_res = await Job.New({
    unique_id: season_id,
    desc: `归档电视剧「${tv_name}/${season_text}]`,
    type: TaskTypes.ArchiveSeason,
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  async function run(season_profile: {
    name: string;
    original_name: string | null;
    season_text: string;
    air_date: string | null;
    episode_count: number;
    episodes: (EpisodeRecord & {
      parsed_episodes: ParsedEpisodeRecord[];
    })[];
  }) {
    const r = await archive_season_files({
      profile: season_profile,
      files: all_parsed_episodes_of_the_season,
      job,
      drive,
      user,
      store,
    });
    job.finish();
  }
  const season_payload = {
    name: tv_name!,
    original_name,
    season_text,
    air_date: season.profile.air_date,
    episode_count: season.profile.episode_count ?? 0,
    episodes: season.episodes,
  };
  run(season_payload);
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      job_id: job.id,
    },
  });
}
