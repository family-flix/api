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
import { Drive } from "@/domains/drive";
import { Job } from "@/domains/job";
import { User } from "@/domains/user";
import { DatabaseStore } from "@/domains/store";
import { FileType, MediaTypes } from "@/constants";
import { Result } from "@/types";
import { build_media_name, parse_filename_for_video } from "@/utils/parse_filename_for_video";

export function get_part_info_list(file_size: number, upload_chunk_size: number) {
  const num_parts = Math.ceil(file_size / upload_chunk_size);
  const part_info_list = [];
  for (let i = 1; i <= num_parts; i++) {
    part_info_list.push({ part_number: i });
  }
  return part_info_list;
}

export async function prepare_upload_file(
  filepath: string,
  options: {
    token: string;
    size: number;
    upload_chunk_size?: number;
  }
) {
  const { size, token, upload_chunk_size = 10 * 1024 * 1024 } = options;

  async function get_proof_code(filepath: string, size: number): Promise<Result<string>> {
    return new Promise((resolve) => {
      const md5_val = crypto.createHash("md5").update(Buffer.from(token, "utf8")).digest("hex");
      const md5_int = BigInt(`0x${md5_val.slice(0, 16)}`);
      const offset = parseInt((md5_int % BigInt(size)).toString(), 10);
      const bytes_to_read = Math.min(8, size - offset);
      const file_partial_buffer = Buffer.allocUnsafe(bytes_to_read);
      fs.createReadStream(filepath, { start: offset, end: offset + bytes_to_read })
        .on("data", (chunk: Buffer) => {
          chunk.copy(file_partial_buffer);
        })
        .on("end", () => {
          resolve(Result.Ok(Buffer.from(file_partial_buffer).toString("base64")));
        })
        .on("error", (error) => {
          resolve(Result.Err(error.message));
        });
    });
  }
  async function get_content_hash(filepath: string): Promise<
    Result<{
      hash: string;
      size: number;
    }>
  > {
    return new Promise((resolve) => {
      const content_hash = crypto.createHash("sha1");
      const stream = fs.createReadStream(filepath, { highWaterMark: upload_chunk_size });
      stream.on("data", (segment) => {
        content_hash.update(segment);
      });
      stream.on("end", () => {
        const result = content_hash.digest("hex").toUpperCase();
        return resolve(
          Result.Ok({
            size: stream.bytesRead,
            hash: result,
          })
        );
      });
      stream.on("error", (error) => {
        resolve(Result.Err(error.message));
      });
    });
  }
  // if (size > 1024) {

  // }
  const rr = await (() => {
    if (size > 1024) {
    }
  })();
  const r1 = await get_content_hash(filepath);
  if (r1.error) {
    return Result.Err(r1.error.message);
  }
  const { hash: content_hash } = r1.data;
  const file_size = size;
  const r2 = await get_proof_code(filepath, size);
  if (r2.error) {
    return Result.Err(r2.error.message);
  }
  const proof_code = r2.data;
  const part_info_list = await get_part_info_list(file_size, upload_chunk_size);
  const body = {
    part_info_list,
    //     type: "file",
    size: file_size,
    content_hash,
    //       content_hash_name: "sha1",
    proof_code,
    //     proof_version: "v1",
  };
  return Result.Ok(body);
}

export async function prepare_upload_file2(
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
export async function archive_season_files(body: {
  job: Job;
  drive: Drive;
  user: User;
  files: TheFilePrepareTransfer[];
  profile: {
    name: string;
    original_name: string | null;
    season_text: string;
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
    }[];
  };
  const { name, original_name, air_date, season_text } = season_profile;
  const tv_name_with_pinyin = build_media_name({ name, original_name });
  const air_date_of_year = dayjs(air_date).year();
  const season_folder_name = [tv_name_with_pinyin, season_text, air_date_of_year].join(".");
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
      job.output.write(
        new ArticleLineNode({
          children: ["无需创建新文件夹"].map(
            (text) =>
              new ArticleTextNode({
                text,
              })
          ),
        })
      );
    }
  }
  const created_folder_res = await (async () => {
    if (need_create_parent_folder) {
      const exceed_res = await drive.is_exceed_capacity();
      if (exceed_res.data) {
        return Result.Err("云盘容量超出且需要文件夹，操作失败");
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
      if (existing_res.data) {
        job.output.write(
          new ArticleLineNode({
            children: ["使用云盘中查找到的"].map(
              (text) =>
                new ArticleTextNode({
                  text,
                })
            ),
          })
        );
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
        job.output.write(
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: `创建文件夹 '${season_folder_name}' 失败，因为 ${r2.error.message}`,
              }),
            ],
          })
        );
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
      job.output.write(
        new ArticleLineNode({
          children: ["使用新创建的文件夹", r2.data.file_id].map(
            (text) =>
              new ArticleTextNode({
                text,
              })
          ),
        })
      );
      return Result.Ok({
        file_id: r2.data.file_id,
        file_name: r2.data.file_name,
      });
    }
    job.output.write(
      new ArticleLineNode({
        children: ["复用现有的文件夹"].map(
          (text) =>
            new ArticleTextNode({
              text,
            })
        ),
      })
    );
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
  for (let i = 0; i < parent_file_ids.length; i += 1) {
    const file_id = parent_file_ids[i];
    await store.prisma.parsed_tv.updateMany({
      where: {
        file_id,
        user_id: user.id,
      },
      data: {
        file_id: created_folder.file_id,
        file_name: created_folder.file_name,
      },
    });
  }
  const errors: {
    file_id: string;
    tip: string;
  }[] = [];
  for (let j = 0; j < files.length; j += 1) {
    await (async () => {
      const parsed_episode = files[j];
      const { file_id, file_name, episode_number, season_number, parent_paths } = parsed_episode;
      const { resolution, source, encode, voice_encode, voice_type, type } = parse_filename_for_video(
        file_name,
        ["resolution", "source", "encode", "voice_encode", "voice_type", "type"],
        user.get_filename_rules()
      );
      const parent_infos = parse_filename_for_video(parent_paths, ["resolution", "source", "voice_type"]);
      const tv_name_with_pinyin = build_media_name({ name, original_name });
      const air_date_of_year = (() => {
        return dayjs(air_date).year();
      })();
      let new_file_name = [
        tv_name_with_pinyin,
        `${season_number}${episode_number}`,
        air_date_of_year,
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
      await store.prisma.parsed_episode.updateMany({
        where: {
          file_id,
        },
        data: {
          parent_file_id: created_folder.file_id,
          parent_paths: new_folder_parent_path,
          file_name: new_file_name,
        },
      });
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
      created_folder.file_ids.push({ file_id });
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
      job.output.write(
        new ArticleLineNode({
          children: ["移动文件到目标文件夹失败"].map(
            (text) =>
              new ArticleTextNode({
                text,
              })
          ),
        })
      );
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
    children: file_ids,
  });
}

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
export async function archive_movie_files(body: {
  job: Job;
  drive: Drive;
  user: User;
  files: {
    file_id: string;
    file_name: string;
    parent_file_id: string;
    parent_paths: string;
  }[];
  profile: {
    name: string | null;
    original_name: string | null;
    air_date: string | null;
  };
  store: DatabaseStore;
}) {
  const { files, profile: movie_profile, drive, job, user, store } = body;
  type CreatedFolder = {
    existing?: boolean;
    file_id: string;
    file_name: string;
    file_ids: {
      file_id: string;
    }[];
  };
  const { name, original_name, air_date } = movie_profile;
  const tv_name_with_pinyin = build_media_name({ name, original_name });
  const air_date_of_year = dayjs(air_date).year();
  const season_folder_name = [tv_name_with_pinyin, air_date_of_year].join(".");
  const new_folder_parent_path = [drive.profile.root_folder_name, season_folder_name].join("/");
  const parents: Record<string, { file_id: string; file_name: string }> = {};
  for (let i = 0; i < files.length; i += 1) {
    const { parent_file_id, parent_paths } = files[i];
    const paths = parent_paths.split("/");
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
      job.output.write(
        new ArticleLineNode({
          children: ["无需创建新文件夹"].map(
            (text) =>
              new ArticleTextNode({
                text,
              })
          ),
        })
      );
    }
  }
  const created_folder_res = await (async () => {
    if (need_create_parent_folder) {
      const exceed_res = await drive.is_exceed_capacity();
      if (exceed_res.data) {
        return Result.Err("云盘容量超出且需要文件夹，操作失败");
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
      if (existing_res.data) {
        job.output.write(
          new ArticleLineNode({
            children: ["使用云盘中查找到的"].map(
              (text) =>
                new ArticleTextNode({
                  text,
                })
            ),
          })
        );
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
        job.output.write(
          new ArticleLineNode({
            children: [
              new ArticleTextNode({
                text: `创建文件夹 '${season_folder_name}' 失败，因为 ${r2.error.message}`,
              }),
            ],
          })
        );
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
      job.output.write(
        new ArticleLineNode({
          children: ["使用新创建的文件夹", r2.data.file_id].map(
            (text) =>
              new ArticleTextNode({
                text,
              })
          ),
        })
      );
      return Result.Ok({
        file_id: r2.data.file_id,
        file_name: r2.data.file_name,
      });
    }
    job.output.write(
      new ArticleLineNode({
        children: ["复用现有的文件夹"].map(
          (text) =>
            new ArticleTextNode({
              text,
            })
        ),
      })
    );
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
      const parsed_movie = files[j];
      const { file_id, file_name, parent_paths } = parsed_movie;
      const { resolution, source, encode, voice_encode, voice_type, type } = parse_filename_for_video(
        file_name,
        ["resolution", "source", "encode", "voice_encode", "voice_type", "type"],
        user.get_filename_rules()
      );
      const parent_infos = parse_filename_for_video(parent_paths, ["resolution", "source", "voice_type"]);
      const tv_name_with_pinyin = build_media_name({ name, original_name });
      const air_date_of_year = (() => {
        return dayjs(air_date).year();
      })();
      let new_file_name = [
        tv_name_with_pinyin,
        air_date_of_year,
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
        job.output.write(
          new ArticleLineNode({
            children: [`将文件「${file_name}」名字修改为「${new_file_name}]`].map(
              (text) =>
                new ArticleTextNode({
                  text,
                })
            ),
          })
        );
        const rename_res = await drive.client.rename_file(file_id, new_file_name, {
          check_name_mode: "auto_rename",
        });
        if (rename_res.error) {
          job.output.write(
            new ArticleLineNode({
              children: ["重命名失败，因为", rename_res.error.message].map(
                (text) =>
                  new ArticleTextNode({
                    text,
                  })
              ),
            })
          );
          return;
        }
        job.output.write(
          new ArticleLineNode({
            children: ["重命名成功，新的名字是", rename_res.data.name].map(
              (text) =>
                new ArticleTextNode({
                  text,
                })
            ),
          })
        );
        new_file_name = rename_res.data.name;
      }
      await store.prisma.parsed_movie.updateMany({
        where: {
          file_id,
        },
        data: {
          parent_file_id: created_folder.file_id,
          parent_paths: new_folder_parent_path,
          file_name: new_file_name,
        },
      });
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
      created_folder.file_ids.push({ file_id });
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
      job.output.write(
        new ArticleLineNode({
          children: ["移动文件到目标文件夹失败"].map(
            (text) =>
              new ArticleTextNode({
                text,
              })
          ),
        })
      );
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
    children: file_ids,
  });
}

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
  for (let i = 0; i < parent_file_ids.length; i += 1) {
    const file_id = parent_file_ids[i];
    await store.prisma.parsed_tv.updateMany({
      where: {
        file_id,
        user_id: user.id,
      },
      data: {
        file_id: created_folder.file_id,
        file_name: created_folder.file_name,
      },
    });
  }
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
        season_profile.type === MediaTypes.Movie ? name_with_pinyin : episode_text,
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
      await store.prisma.parsed_episode.updateMany({
        where: {
          file_id,
        },
        data: {
          parent_file_id: created_folder.file_id,
          parent_paths: new_folder_parent_path,
          file_name: new_file_name,
        },
      });
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
      created_folder.file_ids.push({ file_id });
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
    children: file_ids,
  });
}

export async function read_part_file(filepath: string, size: number, offset = 0): Promise<Result<Buffer>> {
  return new Promise((resolve) => {
    fs.open(filepath, "r", (err, fd) => {
      if (err) {
        return resolve(Result.Err(err.message));
      }
      const b = Buffer.alloc(size);
      fs.read(fd, b, offset, size, null, (err, bytesRead, buffer) => {
        if (err) {
          return resolve(Result.Err(err.message));
        }
        fs.close(fd, (err) => {
          if (err) {
            return resolve(Result.Err(err.message));
          }
          resolve(Result.Ok(buffer));
        });
      });
    });
  });
}

export function read_next_chunk(stream: ReadStream, chunk_size: number) {
  let bytesRead = 0;
  let data = "";
  return new Promise((resolve) => {
    stream.on("data", (chunk) => {
      bytesRead += chunk.length;
      data += chunk;
      if (bytesRead >= chunk_size) {
        stream.pause();
        resolve(Result.Ok(data));
      }
    });
    stream.on("end", () => {
      resolve(Result.Ok(data));
    });
    stream.on("error", (err) => {
      resolve(Result.Err(err.message));
    });
    // stream.resume();
  });
}

export async function file_info(file_path: string): Promise<
  Result<{
    size: number;
    file_type: "directory" | "file" | "unknown";
  }>
> {
  return new Promise((resolve) => {
    fs.stat(file_path, (err, stats) => {
      if (err) {
        const e = err as Error;
        return resolve(Result.Err(e.message));
      }
      return resolve(
        Result.Ok({
          size: stats.size,
          file_type: (() => {
            if (stats.isDirectory()) {
              return "directory";
            }
            if (stats.isFile()) {
              return "file";
            }
            return "unknown";
          })(),
        })
      );
    });
  });
}
