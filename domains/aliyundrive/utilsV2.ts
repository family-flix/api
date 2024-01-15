import crypto from "crypto";
import fs, { ReadStream } from "fs";

import dayjs from "dayjs";

import {
  ArticleLineNode,
  ArticleListItemNode,
  ArticleListNode,
  ArticleSectionNode,
  ArticleTextNode,
} from "@/domains/article";
import { Drive } from "@/domains/drive/v2";
import { Job } from "@/domains/job";
import { User } from "@/domains/user";
import { DatabaseStore } from "@/domains/store";
import { FileType, MediaTypes } from "@/constants";
import { Result } from "@/types";
import { build_media_name, parse_filename_for_video } from "@/utils/parse_filename_for_video";

export type TheFilePrepareTransferV2 = {
  id: string;
  type: FileType;
  file_id: string;
  file_name: string;
  episode_text: string | null;
  parent_file_id: string;
  parent_paths: string;
};

/**
 * 归档指定云盘的指定文件
 * 将剧集源文件重命名，并移动到一个新的文件夹中
 * 返回创建好的文件夹列表 Record<season_number, {
 * // 创建的文件夹 id
 * file_id: string;
 * // 创建的文件夹 id
 * // 文件夹内包含的文件
 * file_ids: string[];
 * }>
 */
export async function archive_media_files(body: {
  job: Job;
  drive: Drive;
  user: User;
  files: TheFilePrepareTransferV2[];
  profile: {
    type: MediaTypes;
    name: string;
    original_name: string | null;
    air_date: string | null;
  };
  store: DatabaseStore;
}) {
  const { files, profile: season_profile, drive, job, user, store } = body;
  type CreatedFolder = {
    existing?: boolean;
    file_id: string;
    file_name: string;
    file_ids: {
      file_id: string;
      name: string;
    }[];
  };
  const { name, air_date } = season_profile;
  const media_name_with_pinyin = build_media_name({ name, original_name: null });
  const air_date_of_year = dayjs(air_date).year();
  const season_folder_name = [media_name_with_pinyin, air_date_of_year].join(".");
  const new_folder_parent_path = [drive.profile.root_folder_name, season_folder_name].join("/");
  const parents: Record<string, { file_id: string; file_name: string }> = {};
  const parent_file_ids: string[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const { parent_file_id, parent_paths } = files[i];
    const paths = parent_paths.split("/");
    if (!parent_file_ids.includes(parent_file_id)) {
      parent_file_ids.push(parent_file_id);
    }
    parents[parent_paths] = {
      file_id: parent_file_id,
      file_name: paths[paths.length - 1],
    };
  }
  let need_create_parent_folder = true;
  const paths = Object.keys(parents);
  if (paths.length === 1) {
    const key = paths[0];
    if (key === new_folder_parent_path) {
      need_create_parent_folder = false;
      job.output.write_line(["无需创建新文件夹"]);
    }
  }
  const created_folder_res = await (async () => {
    if (need_create_parent_folder) {
      const exceed_res = await drive.is_exceed_capacity();
      if (exceed_res.data) {
        return Result.Err("云盘容量超出且需要文件夹，操作失败");
      }
      job.output.write_line([`创建新文件夹「${season_folder_name}」存放格式化后的视频文件`]);
      const existing_res = await drive.client.existing(drive.profile.root_folder_name!, season_folder_name);
      if (existing_res.data) {
        job.output.write_line(["使用云盘中查找到的"]);
        return Result.Ok({
          file_id: existing_res.data.file_id,
          file_name: existing_res.data.name,
        });
      }
      const r2 = await drive.client.add_folder({
        parent_file_id: drive.profile.root_folder_id!,
        name: season_folder_name,
      });
      if (r2.error) {
        job.output.write_line([`创建文件夹「${season_folder_name}」失败，因为 ${r2.error.message}`]);
        return Result.Err(r2.error.message);
      }
      await store.add_file({
        file_id: r2.data.file_id,
        name: r2.data.file_id,
        parent_file_id: drive.profile.root_folder_id!,
        parent_paths: drive.profile.root_folder_name!,
        size: 0,
        type: FileType.Folder,
        drive_id: drive.id,
        user_id: user.id,
      });
      job.output.write_line(["使用新创建的文件夹", r2.data.file_id]);
      return Result.Ok({
        file_id: r2.data.file_id,
        file_name: r2.data.file_name,
      });
    }
    job.output.write_line(["复用现有的文件夹"]);
    return Result.Ok({
      file_id: parents[paths[0]].file_id,
      file_name: season_folder_name,
    });
  })();
  if (created_folder_res.error) {
    return Result.Err(created_folder_res.error.message);
  }
  const created_folder = {
    file_id: created_folder_res.data.file_id,
    file_name: created_folder_res.data.file_name,
    file_ids: [],
  } as CreatedFolder;
  const errors: {
    file_id: string;
    tip: string;
  }[] = [];
  for (let j = 0; j < files.length; j += 1) {
    await (async () => {
      const parsed_episode = files[j];
      const { episode_text, file_id, file_name, parent_paths } = parsed_episode;
      const { resolution, source, encode, voice_encode, voice_type, type } = parse_filename_for_video(
        file_name,
        ["resolution", "source", "encode", "voice_encode", "voice_type", "type"],
        user.get_filename_rules()
      );
      const parent_infos = parse_filename_for_video(parent_paths, ["resolution", "source", "voice_type"]);
      const name_with_pinyin = build_media_name({ name, original_name: null });
      let new_file_name = [
        name_with_pinyin,
        season_profile.type === MediaTypes.Movie ? null : episode_text,
        season_profile.type === MediaTypes.Movie ? air_date_of_year : null,
        resolution || parent_infos.resolution,
        voice_type || parent_infos.voice_type,
        source || parent_infos.source,
        encode || parent_infos.encode,
        voice_encode || parent_infos.voice_encode,
        type.replace(/^\./, ""),
      ]
        .filter(Boolean)
        .join(".");
      if (file_name !== new_file_name) {
        job.output.write_line([`将文件「${file_name}」名字修改为「${new_file_name}」`]);
        const rename_res = await drive.client.rename_file(file_id, new_file_name, {
          check_name_mode: "auto_rename",
        });
        if (rename_res.error) {
          job.output.write_line(["重命名失败，因为", rename_res.error.message]);
          return;
        }
        job.output.write_line(["重命名成功，新的名字是", rename_res.data.name]);
        new_file_name = rename_res.data.name;
      }
      const existing = await store.prisma.parsed_media_source.findFirst({
        where: {
          file_id,
        },
        include: {
          parsed_media: true,
        },
      });
      if (!existing) {
        job.output.write_line(["该文件没有关联的 parsed_media_source"]);
        return;
      }
      const s = await store.prisma.parsed_media_source.update({
        where: {
          id: existing.id,
        },
        data: {
          parent_file_id: created_folder.file_id,
          parent_paths: new_folder_parent_path,
          file_name: new_file_name,
        },
      });
      if (existing.parsed_media_id) {
        const parsed_media = await store.prisma.parsed_media.findFirst({
          where: {
            id: existing.parsed_media_id,
          },
        });
        if (parsed_media) {
          await store.prisma.parsed_media.update({
            where: {
              id: parsed_media.id,
            },
            data: {
              name: season_profile.name,
              original_name: season_profile.original_name,
              air_year: dayjs(season_profile.air_date).format("YYYY"),
            },
          });
        }
      }
      await store.prisma.file.updateMany({
        where: {
          file_id,
        },
        data: {
          parent_file_id: created_folder.file_id,
          parent_paths: new_folder_parent_path,
          name: new_file_name,
        },
      });
      created_folder.file_ids.push({ file_id, name: new_file_name });
    })();
  }
  if (need_create_parent_folder) {
    job.output.write(
      new ArticleSectionNode({
        children: [
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: "移动以下文件",
              }),
              new ArticleListNode({
                children: created_folder.file_ids.map((file) => {
                  return new ArticleListItemNode({
                    children: [
                      new ArticleTextNode({
                        text: file.file_id,
                      }),
                    ],
                  });
                }),
              }),
              new ArticleTextNode({
                text: `到云盘文件夹「${created_folder.file_name}]`,
              }),
            ],
          }),
        ],
      })
    );
    const move_res = await drive.client.move_files_to_folder({
      files: created_folder.file_ids,
      target_folder_id: created_folder.file_id,
    });
    if (move_res.error) {
      job.output.write_line(["移动文件到目标文件夹失败"]);
      errors.push({
        file_id: created_folder.file_id,
        tip: `移动文件到文件夹失败, ${move_res.error.message}`,
      });
    }
  }
  if (errors.length !== 0) {
    return Result.Err(errors.join("\n"), 0, errors);
  }
  const { file_id, file_name, file_ids } = created_folder;
  return Result.Ok({
    file_id,
    file_name,
    air_year: air_date_of_year,
    children: file_ids,
  });
}
