import crypto from "crypto";

import dayjs from "dayjs";

import {
  ArticleLineNode,
  ArticleListItemNode,
  ArticleListNode,
  ArticleSectionNode,
  ArticleTextNode,
} from "@/domains/article";
import { Drive } from "@/domains/drive";
import { Job } from "@/domains/job";
import { User } from "@/domains/user";
import { DatabaseStore } from "@/domains/store";
import { FileType } from "@/constants";
import { Result } from "@/types";
import { build_media_name, parse_filename_for_video } from "@/utils/parse_filename_for_video";

export async function prepare_upload_file(
  file_buffer: Buffer,
  options: {
    token: string;
    upload_chunk_size?: number;
  }
) {
  const { token, upload_chunk_size = 10 * 1024 * 1024 } = options;
  async function get_part_info_list(fileSize: number) {
    const num_parts = Math.ceil(fileSize / upload_chunk_size);
    const part_info_list = [];
    for (let i = 1; i <= num_parts; i++) {
      part_info_list.push({ part_number: i });
    }
    return part_info_list;
  }
  async function get_proof_code(file_buffer: Buffer) {
    const md5_val = crypto.createHash("md5").update(Buffer.from(token, "utf8")).digest("hex");
    const md5_int = BigInt(`0x${md5_val.slice(0, 16)}`);
    const offset = parseInt((md5_int % BigInt(file_buffer.length)).toString(), 10);
    const bytes_to_read = Math.min(8, file_buffer.length - offset);
    const file_partial_buffer = file_buffer.slice(offset, offset + bytes_to_read);
    return Buffer.from(file_partial_buffer).toString("base64");
  }
  async function get_content_hash(file_buffer: Buffer) {
    const content_hash = crypto.createHash("sha1");
    for (let offset = 0; offset < file_buffer.length; offset += upload_chunk_size) {
      const segment = file_buffer.slice(offset, offset + upload_chunk_size);
      content_hash.update(segment);
    }
    const contentHashValue = content_hash.digest("hex").toUpperCase();
    return contentHashValue;
  }

  const file_size = file_buffer.length;
  const content_hash = await get_content_hash(file_buffer);
  const proof_code = await get_proof_code(file_buffer);
  const part_info_list = await get_part_info_list(file_size);
  const body = {
    part_info_list,
    //     type: "file",
    size: file_size,
    content_hash,
    //       content_hash_name: "sha1",
    proof_code,
    //     proof_version: "v1",
  };
  return body;
}

export type TheFilePrepareTransfer = {
  id: string;
  file_id: string;
  file_name: string;
  parent_file_id: string;
  parent_paths: string;
  type: FileType;
  episode_number: string;
  season_number: string;
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
export async function archive_season_files(body: {
  job: Job;
  drive: Drive;
  user: User;
  files: TheFilePrepareTransfer[];
  season_profile: {
    name: string;
    original_name: string | null;
    season_text: string;
    air_date: string | null;
  };
  store: DatabaseStore;
}) {
  const { files, season_profile, drive, job, user, store } = body;
  type CreatedFolder = {
    existing?: boolean;
    file_id: string;
    file_name: string;
    file_ids: {
      file_id: string;
    }[];
  };
  // const parents: Record<string, { file_id: string; file_name: string }> = {};
  // for (let i = 0; i < files.length; i += 1) {
  //   const { parent_file_id, parent_paths } = files[i];
  //   const paths = parent_paths.split("/");
  //   parents[parent_paths] = {
  //     file_id: parent_file_id,
  //     file_name: paths[paths.length - 1],
  //   };
  // }
  const created_folders: Record<string, CreatedFolder> = {};
  const errors: {
    file_id: string;
    tip: string;
  }[] = [];
  for (let j = 0; j < files.length; j += 1) {
    await (async () => {
      const parsed_episode = files[j];
      const { file_id, file_name, episode_number, season_number } = parsed_episode;
      const { name, original_name, air_date } = season_profile;
      if (!name) {
        // 这种情况几乎没有
        errors.push({
          file_id,
          tip: "电视剧没有正确的名称",
        });
        return;
      }
      const { resolution, source, encode, voice_encode, type } = parse_filename_for_video(
        file_name,
        ["resolution", "source", "encode", "voice_encode", "type"],
        user.get_filename_rules()
      );
      const tv_name_with_pinyin = build_media_name({ name, original_name });
      const air_date_of_year = (() => {
        return dayjs(air_date).year();
      })();
      const new_name = [
        tv_name_with_pinyin,
        `${season_number}${episode_number}`,
        air_date_of_year,
        resolution,
        source,
        encode,
        voice_encode,
        type.replace(/^\./, ""),
      ]
        .filter(Boolean)
        .join(".");
      if (file_name !== new_name) {
        job.output.write(
          new ArticleLineNode({
            children: [`将文件「${file_name}」名字修改为「${new_name}」`].map(
              (text) =>
                new ArticleTextNode({
                  text,
                })
            ),
          })
        );
        const rename_res = await drive.client.rename_file(file_id, new_name, {
          check_name_mode: "auto_rename",
        });
        if (rename_res.error) {
          return;
        }
      }
      const season_folder_name = [tv_name_with_pinyin, season_number, air_date_of_year].join(".");
      const new_folder_parent_path = [drive.profile.root_folder_name, season_folder_name].join("/");
      if (parsed_episode.parent_paths === new_folder_parent_path) {
        job.output.write(
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: `父文件夹名称已经是${new_folder_parent_path}，无需修改`,
              }),
            ],
          })
        );
        created_folders[season_number] =
          created_folders[season_number] ||
          ({
            existing: true,
            file_id: parsed_episode.parent_file_id,
            file_name: season_folder_name,
            file_ids: [],
          } as CreatedFolder);
        created_folders[season_number].file_ids.push({ file_id });
        return;
      }
      const season_folder_res = await (async () => {
        if (created_folders[season_number]) {
          const { file_id, file_name } = created_folders[season_number];
          return Result.Ok({
            file_id,
            name: file_name,
          });
        }
        job.output.write(
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: `创建新文件夹 '${season_folder_name}' 存放格式化后的视频文件`,
              }),
            ],
          })
        );
        const existing_res = await drive.client.existing(drive.profile.root_folder_name!, season_folder_name);
        if (existing_res.error) {
          return Result.Err(existing_res.error.message);
        }
        if (existing_res.data) {
          return Result.Ok({
            file_id: existing_res.data.file_id,
            name: season_folder_name,
          });
        }
        const r2 = await drive.client.add_folder({
          parent_file_id: drive.profile.root_folder_id!,
          name: season_folder_name,
        });
        if (r2.error) {
          return Result.Err(r2.error.message);
        }
        const created_season_folder_file_id = r2.data.file_id;
        const r3 = await store.add_file({
          file_id: created_season_folder_file_id,
          name: season_folder_name,
          parent_file_id: drive.profile.root_folder_id!,
          parent_paths: drive.profile.root_folder_name!,
          type: FileType.Folder,
          drive_id: drive.id,
          user_id: user.id,
        });
        if (r3.error) {
          console.log("创建本地文件记录失败", r3.error.message);
        }
        return Result.Ok({
          file_id: created_season_folder_file_id,
          name: season_folder_name,
        });
      })();
      if (season_folder_res.error) {
        job.output.write(
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: `创建文件夹 '${season_folder_name}' 失败，因为 ${season_folder_res.error.message}`,
              }),
            ],
          })
        );
        errors.push({
          file_id,
          tip: `创建文件夹 '${season_folder_name}' 失败，因为 ${season_folder_res.error.message}`,
        });
        return;
      }
      const season_folder = season_folder_res.data;
      created_folders[season_number] =
        created_folders[season_number] ||
        ({
          existing: false,
          file_id: season_folder.file_id,
          file_name: season_folder.name,
          file_ids: [],
        } as CreatedFolder);
      created_folders[season_number].file_ids.push({ file_id });
      await store.prisma.parsed_episode.updateMany({
        where: {
          file_id,
        },
        data: {
          parent_file_id: season_folder.file_id,
          parent_paths: new_folder_parent_path,
          file_name: new_name,
        },
      });
      job.output.write(
        new ArticleLineNode({
          children: [
            new ArticleTextNode({
              text: `更新源文件信息，${file_id} -> ${season_folder.file_id}/${new_name}`,
            }),
          ],
        })
      );
      await store.prisma.file.updateMany({
        where: {
          file_id,
        },
        data: {
          parent_file_id: season_folder.file_id,
          parent_paths: new_folder_parent_path,
          name: new_name,
        },
      });
    })();
  }
  const folders = Object.keys(created_folders);
  for (let k = 0; k < folders.length; k += 1) {
    await (async () => {
      const { existing, file_id, file_ids } = created_folders[folders[k]];
      if (existing) {
        return;
      }
      job.output.write(
        new ArticleSectionNode({
          children: [
            new ArticleLineNode({
              children: [
                new ArticleTextNode({
                  text: "移动以下文件",
                }),
                new ArticleListNode({
                  children: file_ids.map((file) => {
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
                  text: `到云盘文件夹 '${file_id}'`,
                }),
              ],
            }),
          ],
        })
      );
      const exceed_res = await drive.is_exceed_capacity();
      if (exceed_res.data === false) {
        const move_res = await drive.client.move_files_to_folder({
          files: file_ids,
          target_folder_id: file_id,
        });
        if (move_res.error) {
          errors.push({
            file_id,
            tip: `移动文件到文件夹失败, ${move_res.error.message}`,
          });
        }
      }
    })();
  }
  if (errors.length !== 0) {
    return Result.Err(errors.join("\n"), 0, errors);
  }
  return Result.Ok(
    Object.keys(created_folders).map((season_number) => {
      const { file_id, file_name, file_ids } = created_folders[season_number];
      return {
        file_id,
        file_name,
        children: file_ids,
        season_number,
      };
    })[0]
  );
}
