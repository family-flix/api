/**
 * @file 管理后台/将指定季移动到资源盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user";
import { Job, TaskTypes } from "@/domains/job";
import { Drive } from "@/domains/drive/v2";
import { DriveTypes } from "@/domains/drive/constants";
import { AliyunDriveClient } from "@/domains/clients/alipan";
import { DriveAnalysis } from "@/domains/analysis/v2";
import { archive_media_files } from "@/domains/clients/alipan/utilsV2";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { Result } from "@/types/index";
import { FileType, MediaTypes } from "@/constants/index";
import { response_error_factory } from "@/utils/server";
import { sleep } from "@/utils/index";
import { ParsedMediaSourceRecord } from "@/domains/store/types";

export default async function v2_drive_file_to_resource_drive(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id, from_drive_id } = req.body as Partial<{ file_id: string; from_drive_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!file_id) {
    return e(Result.Err("缺少文件 id"));
  }
  const file = await store.prisma.file.findFirst({
    where: {
      file_id,
      user_id: user.id,
    },
  });
  if (!file) {
    return e(Result.Err("没有匹配的文件"));
  }
  const parsed_media_source = await store.prisma.parsed_media_source.findFirst({
    where: {
      file_id,
      user_id: user.id,
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
  if (parsed_media_source === null) {
    return e(Result.Err("没有匹配的记录"));
  }
  if (!parsed_media_source.media_source) {
    return e(Result.Err("没有关联详情"));
  }
  const media = parsed_media_source.media_source.media;
  const { name, original_name } = media.profile;
  const media_name = name || original_name;
  if (!media_name) {
    return e(Result.Err(`「${file.name}」没有名称，请先更新该电视剧详情`));
  }
  const media_payload = {
    id: media.id,
    type: media.type,
    name: media_name,
    original_name,
    air_date: media.profile.air_date,
    episode_count: media.profile.source_count ?? 0,
    file: parsed_media_source,
  };
  const job_res = await Job.New({
    unique_id: parsed_media_source.id,
    desc: `移动文件「${file.name}」到资源盘`,
    type: TaskTypes.MoveToResourceDrive,
    user_id: user.id,
    app,
    store,
  });
  if (job_res.error) {
    return e(Result.Err(job_res.error.message));
  }
  const job = job_res.data;
  async function run(season: {
    id: string;
    type: MediaTypes;
    name: string;
    original_name: string | null;
    air_date: string | null;
    episode_count: number;
    file: ParsedMediaSourceRecord;
  }) {
    const { id, file_id, name, file_name, season_text, episode_text, parent_file_id, parent_paths, drive_id } =
      season.file;
    const from_drive_id = drive_id;
    const from_drive_res = await Drive.Get({ id: from_drive_id, user, store });
    if (from_drive_res.error) {
      job.output.write_line([`获取源云盘「${from_drive_id}」失败，因为`, from_drive_res.error.message]);
      return;
    }
    const from_drive = from_drive_res.data;
    if (!(from_drive.client instanceof AliyunDriveClient)) {
      job.output.write_line([`暂时仅 阿里云盘 支持移动到资源盘`]);
      return;
    }
    const prefix = `[${from_drive.name}]`;
    if (![DriveTypes.AliyunBackupDrive].includes(from_drive.type)) {
      job.output.write_line([prefix, `不是阿里云备份盘，无法移动到资源盘`]);
      return;
    }
    const from_drive_root_folder_id = from_drive.profile.root_folder_id;
    if (!from_drive_root_folder_id) {
      job.output.write_line([prefix, `未设置索引根目录，中断操作`]);
      return;
    }
    job.output.write_line([prefix, "开始归档（格式化名称）"]);
    const archive_res = await archive_media_files({
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
      profile: {
        type: season.type,
        name: season.name,
        original_name: season.original_name,
        air_date: season.air_date,
      },
      job,
      drive: from_drive,
      user,
      store,
    });
    if (archive_res.error) {
      job.output.write_line([prefix, `归档失败，因为`, archive_res.error.message]);
      return;
    }
    job.output.write_line([prefix, `归档成功`]);
    if (!from_drive.client.resource_drive_id) {
      job.output.write_line([prefix, "该备份盘未初始化资源盘"]);
      return;
    }
    const to_drive_res = await Drive.Get({ unique_id: from_drive.client.resource_drive_id, user, store });
    if (to_drive_res.error) {
      job.output.write_line([prefix, "初始化失败，因为", to_drive_res.error.message]);
      return;
    }
    const to_drive = to_drive_res.data;
    if (from_drive.client.resource_drive_id !== to_drive.client.unique_id) {
      job.output.write_line([prefix, "该资源盘不是该备份盘的资源盘"]);
      return;
    }
    const to_drive_root_folder_id = to_drive.profile.root_folder_id;
    const to_drive_root_folder_name = to_drive.profile.root_folder_name;
    if (!to_drive_root_folder_id || !to_drive_root_folder_name) {
      job.output.write_line([prefix, "目标云盘未设置索引根目录"]);
      return;
    }
    const folder_in_from_drive = archive_res.data;
    const folder_in_to_drive = await (async () => {
      const existing_res = await to_drive.client.existing(
        to_drive.profile.root_folder_id!,
        folder_in_from_drive.file_name
      );
      if (existing_res.data !== null) {
        return existing_res.data;
      }
      const r = await to_drive.client.create_folder({
        parent_file_id: to_drive.profile.root_folder_id!,
        name: folder_in_from_drive.file_name,
      });
      if (r.error) {
        return null;
      }
      return r.data;
    })();
    if (folder_in_to_drive === null) {
      job.output.write_line(["目标云盘没有文件夹存放剧集文件"]);
      job.finish();
      return;
    }
    job.output.write_line([prefix, "将文件夹", folder_in_from_drive.file_name, "移动到目标资源盘"]);
    const transfer_res = await from_drive.client.move_file_to_resource_drive({
      file_ids: [file_id],
      parent_id: folder_in_to_drive.file_id,
    });
    if (transfer_res.error) {
      job.output.write_line([prefix, "移动到目标资源盘失败，因为", transfer_res.error.message]);
      return;
    }
    await sleep(5000);
    job.output.write_line([prefix, "在目标云盘索引新增的文件 ", folder_in_from_drive.file_name]);
    const drive_folder_in_to_drive_r = await to_drive.client.existing(
      to_drive.profile.root_folder_id!,
      folder_in_from_drive.file_name
    );
    if (drive_folder_in_to_drive_r.error) {
      job.output.write_line([prefix, "获取目标云盘内文件夹失败", drive_folder_in_to_drive_r.error.message]);
      return;
    }
    const drive_folder_in_to_drive = drive_folder_in_to_drive_r.data;
    if (!drive_folder_in_to_drive) {
      job.output.write_line([prefix, "转存成功后，没有找到目标文件夹"]);
      return;
    }
    const r3 = await DriveAnalysis.New({
      unique_id: job.id,
      drive: to_drive,
      store,
      user,
      assets: app.assets,
      on_print(v) {
        job.output.write(v);
      },
    });
    if (r3.error) {
      job.output.write_line([prefix, "初始化索引失败，因为", r3.error.message]);
      return;
    }
    const analysis = r3.data;
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
      job.output.write_line([prefix, "索引失败，因为", r.error.message]);
      return;
    }
    await walk_model_with_cursor({
      fn(extra) {
        return store.prisma.parsed_media_source.findMany({
          where: {
            cause_job_id: job.id,
            // parent_paths: [to_drive.profile.root_folder_name!, folder_in_from_drive.file_name].join("/"),
            drive_id: to_drive.id,
            user_id: user.id,
          },
          include: {
            parsed_media: true,
          },
          orderBy: {
            created: "desc",
          },
          ...extra,
        });
      },
      async handler(data) {
        const same_file_in_from_drive = await store.prisma.parsed_media_source.findFirst({
          where: {
            file_name: data.file_name,
            parent_paths: [to_drive.profile.root_folder_name!, folder_in_from_drive.file_name].join("/"),
            drive_id: from_drive.id,
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
        if (!same_file_in_from_drive) {
          return;
        }
        await store.prisma.parsed_media_source.update({
          where: {
            id: data.id,
          },
          data: {
            media_source_id: same_file_in_from_drive.media_source_id,
          },
        });
        if (
          data.parsed_media &&
          !data.parsed_media.media_profile_id &&
          same_file_in_from_drive.parsed_media &&
          same_file_in_from_drive.parsed_media.media_profile_id
        ) {
          await store.prisma.parsed_media.update({
            where: {
              id: data.parsed_media.id,
            },
            data: {
              media_profile_id: same_file_in_from_drive.parsed_media.media_profile_id,
            },
          });
        }
      },
    });
    job.output.write_line([prefix, "归档完成"]);
    job.output.write_line(["所有归档任务完成"]);
  }
  (async () => {
    await run(media_payload);
    job.finish();
  })();
  return res.status(200).json({
    code: 0,
    msg: "开始转存",
    data: {
      job_id: job.id,
    },
  });
}
