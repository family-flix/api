/**
 * @file 内存数据库
 * 仅用于单测
 */
import dayjs from "dayjs";
import { PrismaClient } from "@prisma/client";
import omit from "lodash/omit";

import { BaseDomain, Handler } from "@/domains/base";
import { DriveTypes } from "@/domains/drive/constants";
import { FileType, MediaTypes } from "@/constants";
import { update } from "@/utils";
import { Result } from "@/types";

import {
  DataStore,
  DriveRecord,
  DriveTokenRecord,
  FileRecord,
  MediaCountryRecord,
  MediaGenreRecord,
  MediaProfileRecord,
  MediaSourceProfileRecord,
  TmpFileRecord,
} from "./types";

enum Events {
  StateChange,
}
type TheTypesOfEvents = {
  [Events.StateChange]: MemoryStoreState;
};
type MemoryStoreState = {
  drives: DriveRecord[];
  drive_tokens: DriveTokenRecord[];
};
type MemoryStoreProps = {
  drives?: DriveRecord[];
  drive_tokens?: DriveTokenRecord[];
};

export class MemoryStore extends BaseDomain<TheTypesOfEvents> implements DataStore {
  files: FileRecord[] = [];
  tmp_files: TmpFileRecord[] = [];
  media_profiles: MediaProfileRecord[] = [];
  source_profiles: MediaSourceProfileRecord[] = [];
  origin_country: MediaCountryRecord[] = [];
  genres: MediaGenreRecord[] = [];
  drives: DriveRecord[] = [];
  drive_tokens: DriveTokenRecord[] = [];

  get state(): MemoryStoreState {
    return {
      drives: this.drives,
      drive_tokens: this.drive_tokens,
    };
  }

  constructor(props: Partial<{ _name: string }> & MemoryStoreProps) {
    super(props);

    const { drives = [], drive_tokens = [] } = props;

    this.drives = drives;
    this.drive_tokens = drive_tokens;
  }
  // @ts-ignore
  prisma: PrismaClient = {
    // user: {
    //   findFirst() {
    //     return {} as any;
    //   },
    // },
    // settings: {
    //   update() {
    //     return {} as any;
    //   },
    // },
    // @ts-ignore
    file: {
      // @ts-ignore
      findFirst: async (arg: NonNullable<Parameters<PrismaClient["file"]["findFirst"]>[0]>) => {
        const { where, include = {} } = arg;
        if (!where) {
          return null;
        }
        const { id, file_id } = where;
        const matched = (() => {
          if (file_id) {
            const r = this.files.find((d) => String(d.file_id) === String(file_id));
            if (r) {
              return r;
            }
            return null;
          }
          if (id) {
            const r = this.files.find((d) => String(d.id) === String(id));
            if (r) {
              return r;
            }
            return null;
          }
          return null;
        })();
        if (!matched) {
          return null;
        }
        return matched;
      },
      // @ts-ignore
      create: async (arg: NonNullable<Parameters<PrismaClient["file"]["create"]>[0]>) => {
        const data = arg.data;
        const {
          id,
          name,
          file_id,
          parent_file_id,
          parent_paths,
          type = FileType.Unknown,
          size = 0,
          md5 = null,
          drive_id,
          user_id,
        } = data;
        if (!drive_id) {
          return;
        }
        this.files.push({
          created: dayjs().toDate(),
          updated: dayjs().toDate(),
          id,
          name,
          file_id,
          type,
          size,
          md5,
          parent_file_id,
          parent_paths,
          drive_id,
          user_id,
        });
        this.emit(Events.StateChange, { ...this.state });
      },
      // @ts-ignore
      update: async (arg: NonNullable<Parameters<PrismaClient["file"]["update"]>[0]>) => {
        const where = arg.where;
        if (!where) {
          return;
        }
        const matched = await this.prisma.file.findFirst({
          where,
        });
        if (!matched) {
          return null;
        }
        const index = this.files.findIndex((d) => String(d.id) === String(matched.id));
        if (index === -1) {
          return;
        }
        const {
          name,
          file_id,
          parent_file_id,
          parent_paths,
          type = FileType.Unknown,
          size = 0,
          md5 = null,
          drive_id,
          user_id,
        } = matched;
        const payload = {
          ...matched,
          updated: dayjs().toDate(),
          name,
          file_id,
          parent_file_id,
          parent_paths,
          type,
          size,
          md5,
          drive_id,
          user_id,
        };
        // @ts-ignore
        this.files = update(this.files, index, payload);
        this.emit(Events.StateChange, { ...this.state });
      },
    },
    // @ts-ignore
    tmp_file: {
      // @ts-ignore
      findFirst: async (arg: NonNullable<Parameters<PrismaClient["tmp_file"]["findFirst"]>[0]>) => {
        const { where, include = {} } = arg;
        if (!where) {
          return null;
        }
        const { id, file_id } = where;
        const matched = (() => {
          if (file_id) {
            const r = this.tmp_files.find((d) => String(d.file_id) === String(file_id));
            if (r) {
              return r;
            }
            return null;
          }
          if (id) {
            const r = this.tmp_files.find((d) => String(d.id) === String(id));
            if (r) {
              return r;
            }
            return null;
          }
          return null;
        })();
        if (!matched) {
          return null;
        }
        return matched;
      },
      // @ts-ignore
      create: async (arg: NonNullable<Parameters<PrismaClient["tmp_file"]["create"]>[0]>) => {
        const data = arg.data;
        const { id, name, file_id, parent_paths, type = FileType.Unknown, drive_id, user_id } = data;
        if (!drive_id) {
          return;
        }
        if (!file_id) {
          return;
        }
        this.tmp_files.push({
          created: dayjs().toDate(),
          updated: dayjs().toDate(),
          id,
          file_id,
          name,
          type,
          parent_paths,
          drive_id,
          user_id,
        });
        this.emit(Events.StateChange, { ...this.state });
      },
      // @ts-ignore
      update: async (arg: NonNullable<Parameters<PrismaClient["tmp_file"]["update"]>[0]>) => {
        const where = arg.where;
        if (!where) {
          return;
        }
        const matched = await this.prisma.tmp_file.findFirst({
          where,
        });
        if (!matched) {
          return null;
        }
        const index = this.tmp_files.findIndex((d) => String(d.id) === String(matched.id));
        if (index === -1) {
          return;
        }
        const { name, file_id, parent_paths, type = FileType.Unknown, drive_id, user_id } = matched;
        const payload = {
          ...matched,
          updated: dayjs().toDate(),
          name,
          file_id,
          parent_paths,
          type,
          drive_id,
          user_id,
        };
        // @ts-ignore
        this.tmp_files = update(this.tmp_files, index, payload);
        this.emit(Events.StateChange, { ...this.state });
      },
    },
    // resource_sync_task: {
    //   update() {
    //     return {} as any;
    //   },
    // },
    origin_country: {},
    media_profile: {
      // @ts-ignore
      findFirst: async (arg: NonNullable<Parameters<PrismaClient["media_profile"]["findFirst"]>[0]>) => {
        const { where, include = {} } = arg;
        if (!where) {
          return null;
        }
        const { id } = where;
        const matched = (() => {
          if (id) {
            const r = this.drives.find((d) => String(d.id) === String(id));
            if (r) {
              return r;
            }
            return null;
          }
          return null;
        })();
        if (!matched) {
          return null;
        }
        if (include?.origin_country) {
          // 判断是一对多还是一对一，决定用 find 还是 filter
          const r = this.origin_country.filter((d) => String(d.id) === String(matched.drive_token_id));
          if (r) {
            // @ts-ignore
            matched.origin_country = r;
          }
        }
        if (include?.source_profiles) {
          const r = this.source_profiles.filter((d) => String(d.id) === String(matched.drive_token_id));
          if (r) {
            // @ts-ignore
            matched.source_profiles = r;
          }
        }
        // console.log('findFirst return', matched);
        return matched;
      },
      // @ts-ignore
      create: async (arg: NonNullable<Parameters<PrismaClient["media_profile"]["create"]>[0]>) => {
        const data = arg.data;
        let drive_token_id: string = "";
        if (data.origin_country?.create) {
          //   drive_token_id = data.drive_token?.create.id;
          //   await this.prisma.media_country.create({
          //     data: data.origin_country?.create,
          //   });
        }
        const {
          id,
          type = MediaTypes.Season,
          name,
          original_name = null,
          overview = null,
          poster_path = null,
          backdrop_path = null,
          alias = null,
          air_date = null,
          source_count = 0,
          order = 0,
          vote_average = 0,
          in_production = 0,
          tips = "",
          tmdb_id = null,
          imdb_id = null,
          douban_id = null,
          series_id = null,
        } = data;
        this.media_profiles.push({
          created: dayjs().toDate(),
          updated: dayjs().toDate(),
          id,
          type,
          name,
          original_name,
          overview,
          poster_path,
          backdrop_path,
          alias,
          air_date,
          source_count,
          order,
          vote_average,
          in_production,
          tips,
          tmdb_id,
          imdb_id,
          douban_id,
          series_id,
        });
        this.emit(Events.StateChange, { ...this.state });
      },
      // @ts-ignore
      update: async (arg: NonNullable<Parameters<PrismaClient["drive"]["update"]>[0]>) => {
        const where = arg.where;
        if (!where) {
          return;
        }
        const matched = await this.prisma.drive.findFirst({
          where,
        });
        if (!matched) {
          return null;
        }
        if (arg.data.drive_token?.update) {
          await this.prisma.drive_token.update({
            where: {
              id: matched.drive_token_id,
            },
            data: arg.data.drive_token?.update,
          });
        }
        const index = this.drives.findIndex((d) => String(d.id) === String(matched.id));
        if (index === -1) {
          return;
        }
        const { unique_id, avatar, name, remark = null, used_size = 0, total_size = 0, profile } = arg.data;
        const payload = {
          ...omit(matched, ["drive_token"]),
          updated: dayjs().toDate(),
          unique_id,
          avatar,
          name,
          profile,
          remark,
          used_size,
          total_size,
          invalid: 0,
          hidden: 0,
          sort: 0,
          root_folder_id: "",
          root_folder_name: "",
          latest_analysis: dayjs().toDate(),
          user_id: "",
        };
        // @ts-ignore
        this.drives = update(this.drives, index, payload);
        this.emit(Events.StateChange, { ...this.state });
      },
    },
    drive: {
      // @ts-ignore
      findFirst: async (arg: NonNullable<Parameters<PrismaClient["drive"]["findFirst"]>[0]>) => {
        const { where, include = {} } = arg;
        if (!where) {
          return null;
        }
        const { unique_id, id } = where;
        const matched = (() => {
          if (unique_id) {
            const r = this.drives.find((d) => String(d.unique_id) === String(unique_id));
            if (r) {
              return r;
            }
            return null;
          }
          if (id) {
            const r = this.drives.find((d) => String(d.id) === String(id));
            if (r) {
              return r;
            }
            return null;
          }
        })();
        if (!matched) {
          return null;
        }
        if (include?.drive_token) {
          const matched_token = this.drive_tokens.find((d) => String(d.id) === String(matched.drive_token_id));
          if (matched_token) {
            // @ts-ignore
            matched.drive_token = matched_token;
          }
        }
        // console.log('findFirst return', matched);
        return matched;
      },
      // @ts-ignore
      create: async (arg: NonNullable<Parameters<PrismaClient["drive"]["create"]>[0]>) => {
        const data = arg.data;
        let drive_token_id: string = "";
        if (data.drive_token?.create) {
          drive_token_id = data.drive_token?.create.id;
          await this.prisma.drive_token.create({
            data: data.drive_token?.create,
          });
        }
        const { id, unique_id, avatar, name, remark = null, used_size = 0, total_size = 0, profile } = data;
        if (!drive_token_id && data.drive_token_id) {
          drive_token_id = data.drive_token_id;
        }
        this.drives.push({
          type: DriveTypes.AliyunResourceDrive,
          created: dayjs().toDate(),
          updated: dayjs().toDate(),
          id,
          unique_id,
          avatar,
          name,
          profile,
          remark,
          used_size,
          total_size,
          invalid: 0,
          hidden: 0,
          sort: 0,
          root_folder_id: "",
          root_folder_name: "",
          latest_analysis: dayjs().toDate(),
          user_id: "",
          drive_token_id,
        });
        this.emit(Events.StateChange, { ...this.state });
      },
      // @ts-ignore
      update: async (arg: NonNullable<Parameters<PrismaClient["drive"]["update"]>[0]>) => {
        const where = arg.where;
        if (!where) {
          return;
        }
        const matched = await this.prisma.drive.findFirst({
          where,
        });
        if (!matched) {
          return null;
        }
        if (arg.data.drive_token?.update) {
          await this.prisma.drive_token.update({
            where: {
              id: matched.drive_token_id,
            },
            data: arg.data.drive_token?.update,
          });
        }
        const index = this.drives.findIndex((d) => String(d.id) === String(matched.id));
        if (index === -1) {
          return;
        }
        const { unique_id, avatar, name, remark = null, used_size = 0, total_size = 0, profile } = arg.data;
        const payload = {
          ...omit(matched, ["drive_token"]),
          updated: dayjs().toDate(),
          unique_id,
          avatar,
          name,
          profile,
          remark,
          used_size,
          total_size,
          invalid: 0,
          hidden: 0,
          sort: 0,
          root_folder_id: "",
          root_folder_name: "",
          latest_analysis: dayjs().toDate(),
          user_id: "",
        };
        // @ts-ignore
        this.drives = update(this.drives, index, payload);
        this.emit(Events.StateChange, { ...this.state });
      },
    },
    drive_token: {
      // @ts-ignore
      findFirst: async (arg: NonNullable<Parameters<PrismaClient["drive"]["findFirst"]>[0]>) => {
        const { where, include = {} } = arg;
        if (!where) {
          return null;
        }
        const { id } = where;
        const matched = (() => {
          if (id) {
            const r = this.drive_tokens.find((d) => String(d.id) === String(id));
            if (r) {
              return r;
            }
            return null;
          }
        })();
        if (!matched) {
          return null;
        }
        return matched;
      },
      // @ts-ignore
      create: async (arg: NonNullable<Parameters<PrismaClient["drive_token"]["create"]>[0]>) => {
        const { id, data, expired_at } = arg.data;
        this.drive_tokens.push({
          id,
          created: dayjs().toDate(),
          updated: dayjs().toDate(),
          data,
          expired_at,
        });
        this.emit(Events.StateChange, { ...this.state });
      },
      // @ts-ignore
      update: async (arg: NonNullable<Parameters<PrismaClient["drive_token"]["update"]>[0]>) => {
        const where = arg.where;
        if (!where) {
          return;
        }
        const matched = await this.prisma.drive_token.findFirst({
          where,
        });
        if (!matched) {
          return;
        }
        const index = this.drive_tokens.findIndex((d) => String(d.id) === String(matched.id));
        if (index === -1) {
          return;
        }
        const { data, expired_at } = arg.data;
        const payload = {
          ...matched,
          data,
          expired_at,
        };
        // @ts-ignore
        this.drive_tokens = update(this.drive_tokens, index, payload);
        this.emit(Events.StateChange, { ...this.state });
      },
    },
  };
  find_drive(where: Partial<{ unique_id: string; id: string | number }>) {
    const { id, unique_id } = where;
    if (unique_id !== undefined) {
      const r = this.drives.find((d) => String(d.unique_id) === String(unique_id));
      if (r) {
        return Result.Ok(r);
      }
    }
    if (id !== undefined) {
      const r = this.drives.find((d) => String(d.id) === String(id));
      if (r) {
        return Result.Ok(r);
      }
    }
    return Result.Ok(null);
  }
  update_drive(id: string | number, payload: Partial<DriveRecord>) {
    const matched_index = this.drives.findIndex((d) => String(d.id) === String(id));
    if (matched_index === -1) {
      return null;
    }
    this.drives[matched_index] = {
      ...this.drives[matched_index],
      ...payload,
    };
    this.emit(Events.StateChange, { ...this.state });
    return Result.Ok(this.drives[matched_index]);
  }
  find_aliyun_drive_token(where: { id: string | number }) {
    const { id } = where;
    const r = this.drive_tokens.find((t) => String(t.id) === String(id));
    if (r) {
      return Result.Ok(r);
    }
    return Result.Ok(null);
  }
  /** 更新 token */
  update_aliyun_drive_token(id: string | number, payload: Partial<unknown>) {
    const matched_index = this.drive_tokens.findIndex((d) => String(d.id) === String(id));
    if (matched_index === -1) {
      return null;
    }
    this.drive_tokens[matched_index] = {
      ...this.drive_tokens[matched_index],
      ...payload,
    };
    this.emit(Events.StateChange, { ...this.state });
    return Result.Ok(this.drive_tokens[matched_index]);
  }

  list_with_cursor() {
    return Promise.resolve({
      next_marker: null,
      list: [],
    });
  }

  onStateChange(handler: Handler<TheTypesOfEvents[Events.StateChange]>) {
    return this.on(Events.StateChange, handler);
  }
}
