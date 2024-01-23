/**
 * @file 管理后台/归档指定文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { Job, TaskTypes } from "@/domains/job";
import { ParsedMediaSourceRecord } from "@/domains/store/types";
import { Drive } from "@/domains/drive/v2";
import { DriveAnalysis } from "@/domains/analysis/v2";
import { archive_media_files } from "@/domains/aliyundrive/utilsV2";
import { BaseApiResp, Result } from "@/types";
import { FileType, MediaTypes } from "@/constants";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";
import { sleep } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { from_drive_id, to_drive_id, file_id } = req.body as Partial<{
    file_id: string;
    from_drive_id: string;
    to_drive_id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!file_id) {
    return e(Result.Err("缺少文件 file_id"));
  }
  if (!to_drive_id) {
    return e(Result.Err("缺少目标云盘 id"));
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
  const parsed_episode = await store.prisma.parsed_media_source.findFirst({
    where: {
      file_id,
      // user_id: user.id,
    },
    include: {
      media_source: {
        include: {
          profile: true,
          media: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });
  if (!parsed_episode) {
    return e(Result.Err("该文件没有关联解析结果"));
  }
  if (!parsed_episode.media_source) {
    return e(Result.Err("没有匹配的信息"));
  }
  const { name, original_name, air_date } = parsed_episode.media_source.media.profile;
  const n = name || original_name;
  if (!n) {
    return e(Result.Err("剧集信息缺少名称"));
  }
  const payload = {
    media_id: parsed_episode.media_source.media.id,
    type: parsed_episode.media_source.media.type,
    name: n,
    original_name,
    air_date,
    source: parsed_episode,
  };
  const drive_res = await Drive.Get({ id: file.drive_id, user, store });
  if (drive_res.error) {
    return e(Result.Err(drive_res.error.message));
  }
  const from_drive = drive_res.data;
  const to_drive_res = await Drive.Get({ id: to_drive_id, user, store });
  if (to_drive_res.error) {
    return e(Result.Err(to_drive_res.error.message));
  }
  const to_drive = to_drive_res.data;
  const job_res = await Job.New({
    unique_id: file.id,
    desc: `文件「${file.name}」归档`,
    type: TaskTypes.ArchiveSeason,
    user_id: user.id,
    store,
  });
  if (job_res.error) {
    return e(Result.Err(job_res.error.message));
  }
  const job = job_res.data;
  async function run(payload: {
    type: MediaTypes;
    name: string;
    original_name: string | null;
    air_date: string | null;
    source: ParsedMediaSourceRecord;
  }) {
    const { source } = payload;
    const { id, file_id, name, file_name, episode_text, season_text, parent_file_id, parent_paths } = source;
    const to_drive_root_folder_id = to_drive.profile.root_folder_id;
    if (!to_drive_root_folder_id) {
      job.output.write_line(["目标云盘没有设置索引根目录"]);
      job.finish();
      return;
    }
    const created_folder_res = await archive_media_files({
      profile: payload,
      files: [
        {
          id,
          file_id,
          file_name,
          type: FileType.File,
          episode_text,
          parent_file_id,
          parent_paths,
        },
      ],
      job,
      drive: from_drive,
      user,
      store,
    });
    if (created_folder_res.error) {
      job.output.write_line(["归档失败，因为", created_folder_res.error.message]);
      job.finish();
      return;
    }
    const folder_in_from_drive = created_folder_res.data;
    const folder_in_to_drive = await (async () => {
      const existing_res = await to_drive.client.existing(
        to_drive.profile.root_folder_id!,
        folder_in_from_drive.file_name
      );
      if (existing_res.data !== null) {
        return existing_res.data;
      }
      const r = await to_drive.client.add_folder({
        parent_file_id: to_drive.profile.root_folder_id!,
        name: folder_in_from_drive.file_name,
      });
      if (r.error) {
        return null;
      }
      return r.data;
    })();
    if (folder_in_to_drive === null) {
      job.output.write_line(["目标云盘没有文件夹存放资源文件"]);
      job.finish();
      return;
    }
    const transfer_res = await from_drive.client.move_files_to_drive({
      file_ids: [file_id],
      target_drive_client: to_drive.client,
      target_folder_id: folder_in_to_drive.file_id,
    });
    if (transfer_res.error) {
      job.output.write_line(["转存分享资源失败，因为", transfer_res.error.message]);
      job.finish();
      return;
    }
    await sleep(3000);
    const drive_folder_in_to_drive_r = await to_drive.client.existing(
      to_drive.profile.root_folder_id!,
      folder_in_from_drive.file_name
    );
    if (drive_folder_in_to_drive_r.error) {
      job.output.write_line(["获取目标云盘内文件夹失败", drive_folder_in_to_drive_r.error.message]);
      return;
    }
    const drive_folder_in_to_drive = drive_folder_in_to_drive_r.data;
    if (!drive_folder_in_to_drive) {
      job.output.write_line(["转存成功后，没有找到目标文件夹"]);
      return;
    }
    const analysis_res = await DriveAnalysis.New({
      drive: to_drive,
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
    const r = await analysis.run2(
      [
        {
          file_id: drive_folder_in_to_drive.file_id,
          name: drive_folder_in_to_drive.name,
          type: FileType.Folder,
        },
      ],
      {
        async before_search() {
          return false;
        },
      }
    );
    if (r.error) {
      job.output.write_line(["索引失败，因为", r.error.message]);
      return;
    }
    const source_in_from_drive = await store.prisma.parsed_media_source.findFirst({
      where: {
        file_id,
        drive_id: from_drive.id,
      },
      include: {
        parsed_media: true,
      },
      orderBy: {
        created: "desc",
      },
    });
    if (!source_in_from_drive) {
      job.output.write_line(["没有找到修改文件名后的文件"]);
      return;
    }
    const same_file_in_to_drive = await store.prisma.parsed_media_source.findFirst({
      where: {
        file_name: source_in_from_drive.file_name,
        parent_paths: [to_drive.profile.root_folder_name!, folder_in_from_drive.file_name].join("/"),
        drive_id: to_drive.id,
        user_id: user.id,
      },
      include: {
        parsed_media: true,
        media_source: {
          include: {
            profile: true,
          },
        },
      },
    });
    if (!same_file_in_to_drive) {
      job.output.write_line(["没有在目标云盘找到文件"]);
      return;
    }
    await store.prisma.parsed_media_source.update({
      where: {
        id: same_file_in_to_drive.id,
      },
      data: {
        media_source_id: source_in_from_drive.media_source_id,
      },
    });
    if (
      source_in_from_drive.parsed_media &&
      !source_in_from_drive.parsed_media.media_profile_id &&
      same_file_in_to_drive.parsed_media &&
      same_file_in_to_drive.parsed_media.media_profile_id
    ) {
      await store.prisma.parsed_media.update({
        where: {
          id: same_file_in_to_drive.parsed_media.id,
        },
        data: {
          media_profile_id: source_in_from_drive.parsed_media.media_profile_id,
        },
      });
    }
    job.output.write_line(["完成归档"]);
    job.finish();
  }
  run(payload);
  res.status(200).json({ code: 0, msg: "移动剧集文件", data: { job_id: job.id } });
}
