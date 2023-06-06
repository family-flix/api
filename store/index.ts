import dayjs from "dayjs";
import { PrismaClient } from "@prisma/client";

import { List } from "@/domains/list";
import { AliyunDriveFolder } from "@/domains/folder";
import { Result, resultify, Unpacked } from "@/types";
import { r_id } from "@/utils";
import { DatabaseStore } from "@/domains/store";
import { FileType } from "@/constants";

import { ModelKeys } from "./types";

function add_factory<T extends PrismaClient[ModelKeys]>(model: T, options: Partial<{ safe: boolean }> = {}) {
  const { safe } = options;
  return async (
    data: Omit<Parameters<T["create"]>[0]["data"], "id"> & {
      // 仅测试环境可以传入 id 方便单测
      id?: string;
    }
  ) => {
    const { id, ...rest } = data;
    try {
      // @ts-ignore
      const created = (await model.create({
        data: {
          id: id || r_id(),
          ...rest,
        },
      })) as Unpacked<ReturnType<T["create"]>>;
      return Result.Ok(created);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e);
    }
  };
}
function update_factory<T extends PrismaClient[ModelKeys]>(model: T) {
  return async (id: string, data: Parameters<T["update"]>[0]["data"]) => {
    try {
      // @ts-ignore
      const r = await model.update({
        where: {
          id,
        },
        data: {
          updated: dayjs().toISOString(),
          ...data,
        },
      });
      return Result.Ok(r);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e);
    }
  };
}
function first_factory<T extends PrismaClient[ModelKeys]>(model: T) {
  return async (where: Parameters<T["update"]>[0]["data"] & { id?: string | null }) => {
    try {
      // @ts-ignore
      const r = (await model.findFirst({
        where,
      })) as Unpacked<ReturnType<T["findFirst"]>>;
      return Result.Ok(r);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e);
    }
  };
}
function many_factory<T extends PrismaClient[ModelKeys]>(model: T) {
  return async (
    where: Parameters<T["update"]>[0]["data"] & { id?: string | null } = {},
    extra: Partial<{
      sorts: {
        key: string;
        order: "ASC" | "DESC";
      }[];
    }> = {}
  ) => {
    const { sorts = [] } = extra;
    let orderBy = {};
    if (sorts.length !== 0) {
      orderBy = sorts
        .map((s) => {
          const { key, order } = s;
          return {
            [key]: order === "ASC" ? "asc" : "desc",
          };
        })
        .reduce((total, cur) => {
          return { ...total, ...cur };
        }, {});
    }
    try {
      // @ts-ignore
      const r = (await model.findMany({
        where,
        orderBy,
      })) as Unpacked<ReturnType<T["findMany"]>>;
      return Result.Ok(r);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e);
    }
  };
}
function delete_factory<T extends PrismaClient[ModelKeys]>(model: T) {
  return async (search: Parameters<T["update"]>[0]["data"] & { id?: string | null }) => {
    try {
      // @ts-ignore
      const existing = await model.findFirst({
        where: search,
      });
      if (existing === null) {
        return Result.Err("There is no matched record");
      }
      // @ts-ignore
      const r = await model.delete({
        where: {
          id: existing.id,
        },
      });
      return Result.Ok(r);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e);
    }
  };
}
export function pagination_factory<T extends PrismaClient[ModelKeys]>(model: T) {
  return async (
    params: Parameters<T["findMany"]>[0] & {
      id?: string;
    },
    extra: {
      page?: number;
      size?: number;
      page_size?: number;
      sorts?: {
        key: string;
        order: "DESC" | "ASC";
      }[];
    } = {}
  ) => {
    const { page = 1, page_size = 10, size = page_size, sorts = [] } = extra;
    const core = new List(model, {
      page: Number(page),
      page_size: Number(size),
      search: params.where || {},
      select: params.select,
      sorts,
    });
    const r = await core.fetch();
    return r;
  };
}

export const store_factory = (prisma: PrismaClient) => {
  return {
    prisma,
    table_names: [] as ModelKeys[],
    clear_dataset: (name: ModelKeys) => {
      // @ts-ignore
      return prisma[name].deleteMany({});
    },
    operation: {
      async get<T>(sql: string) {
        try {
          const r = await prisma.$queryRaw`${sql}`;
          return Result.Ok(r as T);
        } catch (err) {
          const e = err as Error;
          return Result.Err(e);
        }
      },
      async all<T>(sql: string) {
        try {
          const r = await prisma.$queryRaw`${sql}`;
          return Result.Ok(r as T);
        } catch (err) {
          const e = err as Error;
          return Result.Err(e);
        }
      },
    },
    /** 云盘 */
    add_drive: add_factory<PrismaClient["drive"]>(prisma.drive),
    update_drive: update_factory<PrismaClient["drive"]>(prisma.drive),
    delete_drive: delete_factory<PrismaClient["drive"]>(prisma.drive),
    find_drive: first_factory<PrismaClient["drive"]>(prisma.drive),
    find_drive_list: many_factory<PrismaClient["drive"]>(prisma.drive),
    find_drive_list_with_pagination: pagination_factory<PrismaClient["drive"]>(prisma.drive),
    /** 云盘凭证 */
    add_aliyun_drive_token: add_factory<PrismaClient["drive_token"]>(prisma.drive_token),
    update_aliyun_drive_token: update_factory<PrismaClient["drive_token"]>(prisma.drive_token),
    find_aliyun_drive_token: first_factory<PrismaClient["drive_token"]>(prisma.drive_token),
    find_aliyun_drive_token_list: many_factory<PrismaClient["drive_token"]>(prisma.drive_token),
    /** 电视剧详情 */
    add_tv_profile: add_factory<PrismaClient["tv_profile"]>(prisma.tv_profile),
    update_tv_profile: update_factory<PrismaClient["tv_profile"]>(prisma.tv_profile),
    find_tv_profile: first_factory<PrismaClient["tv_profile"]>(prisma.tv_profile),
    find_tv_profiles: many_factory<PrismaClient["tv_profile"]>(prisma.tv_profile),
    find_tv_profiles_with_pagination: pagination_factory<PrismaClient["tv_profile"]>(prisma.tv_profile),
    /** 电视剧季详情 */
    add_season_profile: add_factory<PrismaClient["season_profile"]>(prisma.season_profile),
    update_season_profile: update_factory<PrismaClient["season_profile"]>(prisma.season_profile),
    find_season_profile: first_factory<PrismaClient["season_profile"]>(prisma.season_profile),
    find_season_profile_list: many_factory<PrismaClient["season_profile"]>(prisma.season_profile),
    find_season_profile_list_with_pagination: pagination_factory<PrismaClient["season_profile"]>(prisma.season_profile),
    /** 电视剧集详情 */
    add_episode_profile: add_factory<PrismaClient["episode_profile"]>(prisma.episode_profile),
    update_episode_profile: update_factory<PrismaClient["episode_profile"]>(prisma.episode_profile),
    find_episode_profile: first_factory<PrismaClient["episode_profile"]>(prisma.episode_profile),
    find_episode_profile_list: many_factory<PrismaClient["episode_profile"]>(prisma.episode_profile),
    find_episode_profile_list_with_pagination: pagination_factory<PrismaClient["episode_profile"]>(
      prisma.episode_profile
    ),
    /** 电影详情 */
    add_movie_profile: add_factory<PrismaClient["episode_profile"]>(prisma.episode_profile),
    update_movie_profile: update_factory<PrismaClient["episode_profile"]>(prisma.episode_profile),
    find_movie_profile: first_factory<PrismaClient["episode_profile"]>(prisma.episode_profile),
    find_movie_profile_list: many_factory<PrismaClient["episode_profile"]>(prisma.episode_profile),
    find_movie_profile_list_with_pagination: pagination_factory<PrismaClient["episode_profile"]>(
      prisma.episode_profile
    ),
    /** 电视剧 */
    add_tv: add_factory<PrismaClient["tv"]>(prisma.tv),
    update_tv: update_factory<PrismaClient["tv"]>(prisma.tv),
    delete_tv: delete_factory<PrismaClient["tv"]>(prisma.tv),
    find_tv: first_factory<PrismaClient["tv"]>(prisma.tv),
    find_tvs: many_factory<PrismaClient["tv"]>(prisma.tv),
    find_tv_with_pagination: pagination_factory<PrismaClient["tv"]>(prisma.tv),
    /** 电视剧季 */
    add_season: add_factory<PrismaClient["season"]>(prisma.season),
    update_season: update_factory<PrismaClient["season"]>(prisma.season),
    delete_season: delete_factory<PrismaClient["season"]>(prisma.season),
    find_season: first_factory<PrismaClient["season"]>(prisma.season),
    find_seasons: many_factory<PrismaClient["season"]>(prisma.season),
    find_seasons_with_pagination: pagination_factory<PrismaClient["season"]>(prisma.season),
    /** 电视剧集 */
    add_episode: add_factory<PrismaClient["episode"]>(prisma.episode),
    update_episode: update_factory<PrismaClient["episode"]>(prisma.episode),
    delete_episode: delete_factory<PrismaClient["episode"]>(prisma.episode),
    find_episode: first_factory<PrismaClient["episode"]>(prisma.episode),
    find_episodes: many_factory<PrismaClient["episode"]>(prisma.episode),
    find_episodes_with_pagination: pagination_factory<PrismaClient["episode"]>(prisma.episode),
    /** 电影 */
    add_movie: add_factory<PrismaClient["movie"]>(prisma.movie),
    update_movie: update_factory<PrismaClient["movie"]>(prisma.movie),
    find_movie: first_factory<PrismaClient["movie"]>(prisma.movie),
    find_movies: many_factory<PrismaClient["movie"]>(prisma.movie),
    /** 从云盘文件解析出的电视剧信息 */
    add_parsed_tv: add_factory<PrismaClient["parsed_tv"]>(prisma.parsed_tv),
    update_parsed_tv: update_factory<PrismaClient["parsed_tv"]>(prisma.parsed_tv),
    delete_parsed_tv: delete_factory<PrismaClient["parsed_tv"]>(prisma.parsed_tv),
    find_parsed_tv: first_factory<PrismaClient["parsed_tv"]>(prisma.parsed_tv),
    find_parsed_tv_list: many_factory<PrismaClient["parsed_tv"]>(prisma.parsed_tv),
    find_parsed_tv_list_with_pagination: pagination_factory<PrismaClient["parsed_tv"]>(prisma.parsed_tv),
    /** 从云盘文件解析出的电视剧季信息 */
    add_parsed_season: add_factory<PrismaClient["parsed_season"]>(prisma.parsed_season),
    update_parsed_season: update_factory<PrismaClient["parsed_season"]>(prisma.parsed_season),
    delete_parsed_season: delete_factory<PrismaClient["parsed_season"]>(prisma.parsed_season),
    find_parsed_season: first_factory<PrismaClient["parsed_season"]>(prisma.parsed_season),
    find_parsed_season_list: many_factory<PrismaClient["parsed_season"]>(prisma.parsed_season),
    find_parsed_season_list_with_pagination: pagination_factory<PrismaClient["parsed_season"]>(prisma.parsed_season),
    /** 从云盘文件解析出的电视剧集信息 */
    add_parsed_episode: add_factory<PrismaClient["parsed_episode"]>(prisma.parsed_episode),
    update_parsed_episode: update_factory<PrismaClient["parsed_episode"]>(prisma.parsed_episode),
    delete_parsed_episode: delete_factory<PrismaClient["parsed_episode"]>(prisma.parsed_episode),
    find_parsed_episode: first_factory<PrismaClient["parsed_episode"]>(prisma.parsed_episode),
    find_parsed_episode_list: many_factory<PrismaClient["parsed_episode"]>(prisma.parsed_episode),
    find_parsed_episode_list_with_pagination: pagination_factory<PrismaClient["parsed_episode"]>(prisma.parsed_episode),
    /** 播放记录 */
    add_history: add_factory<PrismaClient["play_history"]>(prisma.play_history),
    update_history: update_factory<PrismaClient["play_history"]>(prisma.play_history),
    delete_history: delete_factory<PrismaClient["play_history"]>(prisma.play_history),
    find_history: first_factory<PrismaClient["play_history"]>(prisma.play_history),
    find_histories: many_factory<PrismaClient["play_history"]>(prisma.play_history),
    find_history_with_pagination: pagination_factory<PrismaClient["play_history"]>(prisma.play_history),
    /** 成员凭证 */
    add_member_link: add_factory<PrismaClient["member_token"]>(prisma.member_token),
    update_member_link: update_factory<PrismaClient["member_token"]>(prisma.member_token),
    delete_member_link: delete_factory<PrismaClient["member_token"]>(prisma.member_token),
    find_member_link: first_factory<PrismaClient["member_token"]>(prisma.member_token),
    find_member_links: many_factory<PrismaClient["member_token"]>(prisma.member_token),
    find_member_link_with_pagination: pagination_factory<PrismaClient["member_token"]>(prisma.member_token),
    /** 成员 */
    add_member: add_factory<PrismaClient["member"]>(prisma.member),
    update_member: update_factory<PrismaClient["member"]>(prisma.member),
    delete_member: delete_factory<PrismaClient["member"]>(prisma.member),
    find_member: first_factory<PrismaClient["member"]>(prisma.member),
    find_members: many_factory<PrismaClient["member"]>(prisma.member),
    find_member_with_pagination: pagination_factory<PrismaClient["member"]>(prisma.member),
    /** 成员推荐影片 */
    add_recommended_tv: add_factory<PrismaClient["recommended_tv"]>(prisma.recommended_tv),
    update_recommended_tv: update_factory<PrismaClient["recommended_tv"]>(prisma.recommended_tv),
    delete_recommended_tv: delete_factory<PrismaClient["recommended_tv"]>(prisma.recommended_tv),
    find_recommended_tv: first_factory<PrismaClient["recommended_tv"]>(prisma.recommended_tv),
    find_recommended_tvs: many_factory<PrismaClient["recommended_tv"]>(prisma.recommended_tv),
    find_recommended_tv_with_pagination: pagination_factory<PrismaClient["recommended_tv"]>(prisma.recommended_tv),
    /** 索引任务 */
    add_task: add_factory<PrismaClient["async_task"]>(prisma.async_task),
    update_task: update_factory<PrismaClient["async_task"]>(prisma.async_task),
    find_task: first_factory<PrismaClient["async_task"]>(prisma.async_task),
    find_task_list: many_factory<PrismaClient["async_task"]>(prisma.async_task),
    delete_task: delete_factory<PrismaClient["async_task"]>(prisma.async_task),
    find_task_list_with_pagination: pagination_factory<PrismaClient["async_task"]>(prisma.async_task),
    /** 云盘签到 */
    add_check_in: add_factory<PrismaClient["drive_check_in"]>(prisma.drive_check_in),
    /** 电视剧详情快照 */
    add_tv_profile_snap: add_factory<PrismaClient["tv_profile_quick"]>(prisma.tv_profile_quick),
    find_tv_profile_snap: first_factory<PrismaClient["tv_profile_quick"]>(prisma.tv_profile_quick),
    /** 分享资源 */
    add_shared_files: add_factory<PrismaClient["shared_file"]>(prisma.shared_file),
    add_shared_files_safely: async (body: Omit<Parameters<PrismaClient["shared_file"]["create"]>[0]["data"], "id">) => {
      const { url } = body;
      const existing = await prisma.shared_file.findFirst({
        where: { url },
      });
      if (existing !== null) {
        return Result.Ok(existing);
      }
      return add_factory<PrismaClient["shared_file"]>(prisma.shared_file)(body);
    },
    update_shared_files: update_factory<PrismaClient["shared_file"]>(prisma.shared_file),
    delete_shared_files: delete_factory<PrismaClient["shared_file"]>(prisma.shared_file),
    find_shared_files: first_factory<PrismaClient["shared_file"]>(prisma.shared_file),
    find_shared_files_list: many_factory<PrismaClient["shared_file"]>(prisma.shared_file),
    find_shared_files_list_with_pagination: pagination_factory<PrismaClient["shared_file"]>(prisma.shared_file),
    /** 分享资源同步任务 */
    add_sync_task: add_factory<PrismaClient["bind_for_parsed_tv"]>(prisma.bind_for_parsed_tv),
    update_sync_task: update_factory<PrismaClient["bind_for_parsed_tv"]>(prisma.bind_for_parsed_tv),
    delete_sync_task: delete_factory<PrismaClient["bind_for_parsed_tv"]>(prisma.bind_for_parsed_tv),
    find_sync_task: first_factory<PrismaClient["bind_for_parsed_tv"]>(prisma.bind_for_parsed_tv),
    find_sync_task_list: many_factory<PrismaClient["bind_for_parsed_tv"]>(prisma.bind_for_parsed_tv),
    find_sync_task_list_with_pagination: pagination_factory<PrismaClient["bind_for_parsed_tv"]>(
      prisma.bind_for_parsed_tv
    ),
    /** 云盘文件 */
    add_file: add_factory<PrismaClient["file"]>(prisma.file),
    update_file: update_factory<PrismaClient["file"]>(prisma.file),
    delete_file: delete_factory<PrismaClient["file"]>(prisma.file),
    find_file: first_factory<PrismaClient["file"]>(prisma.file),
    find_files: many_factory<PrismaClient["file"]>(prisma.file),
    find_file_with_pagination: pagination_factory<PrismaClient["file"]>(prisma.file),
    /** 云盘临时文件 */
    add_tmp_file: add_factory<PrismaClient["tmp_file"]>(prisma.tmp_file),
    update_tmp_file: update_factory<PrismaClient["tmp_file"]>(prisma.tmp_file),
    delete_tmp_file: delete_factory<PrismaClient["tmp_file"]>(prisma.tmp_file),
    find_tmp_file: first_factory<PrismaClient["tmp_file"]>(prisma.tmp_file),
    find_tmp_files: many_factory<PrismaClient["tmp_file"]>(prisma.tmp_file),
    find_tmp_file_with_pagination: pagination_factory<PrismaClient["tmp_file"]>(prisma.tmp_file),
    /** 转存记录 */
    add_shared_file_save: add_factory<PrismaClient["shared_file_in_progress"]>(prisma.shared_file_in_progress),
    update_shared_file_save: update_factory<PrismaClient["shared_file_in_progress"]>(prisma.shared_file_in_progress),
    delete_shared_file_save: delete_factory<PrismaClient["shared_file_in_progress"]>(prisma.shared_file_in_progress),
    find_shared_file_save: first_factory<PrismaClient["shared_file_in_progress"]>(prisma.shared_file_in_progress),
    find_shared_file_save_list: many_factory<PrismaClient["shared_file_in_progress"]>(prisma.shared_file_in_progress),
    find_shared_files_save_with_pagination: pagination_factory<PrismaClient["shared_file_in_progress"]>(
      prisma.shared_file_in_progress
    ),
    /** 用户 */
    add_user: add_factory<PrismaClient["user"]>(prisma.user),
    update_user: update_factory<PrismaClient["user"]>(prisma.user),
    delete_user: delete_factory<PrismaClient["user"]>(prisma.user),
    find_user: first_factory<PrismaClient["user"]>(prisma.user),
    find_users: many_factory<PrismaClient["user"]>(prisma.user),
    find_user_with_pagination: pagination_factory<PrismaClient["user"]>(prisma.user),

    // add_tv_need_complete: add_factory<PrismaClient["tv_need_complete"]>(prisma.tv_need_complete),
    // update_tv_need_complete: update_factory<PrismaClient["tv_need_complete"]>(prisma.tv_need_complete),
    // delete_tv_need_complete: delete_factory<PrismaClient["tv_need_complete"]>(prisma.tv_need_complete),
    // find_tv_need_complete: first_factory<PrismaClient["tv_need_complete"]>(prisma.tv_need_complete),
    // find_tv_need_complete_list: many_factory<PrismaClient["tv_need_complete"]>(prisma.tv_need_complete),
    // find_tv_need_complete_with_pagination: pagination_factory<PrismaClient["tv_need_complete"]>(
    //   prisma.tv_need_complete
    // ),
  };
};

export const store = store_factory(new PrismaClient());

/**
 * 本地存储的 folder client，和 drive client 等同使用
 * @param body
 * @param store
 * @returns
 */
export function folder_client(body: { drive_id: string }, store: DatabaseStore) {
  const { drive_id } = body;
  return {
    async fetch_file(id: string) {
      const r = await store.find_file({ file_id: id, drive_id });
      if (r.error) {
        return r;
      }
      if (!r.data) {
        return Result.Err("No matched record");
      }
      return Result.Ok({
        ...r.data,
        type: r.data.type === 1 ? "file" : "folder",
      });
    },
    async fetch_files(id: string, options: { marker?: string } = {}) {
      const { marker } = options;
      const page_size = 20;
      const r = await resultify(store.prisma.file.findMany.bind(store.prisma.file))({
        where: {
          parent_file_id: id,
          drive_id: drive_id,
          name: marker === "" ? undefined : { lte: marker },
        },
        orderBy: {
          name: "desc",
        },
        take: page_size + 1,
      });
      if (r.error) {
        return r;
      }
      const rows = r.data.map((f) => {
        const { file_id, parent_file_id, name, type } = f;
        return {
          file_id,
          parent_file_id,
          name,
          type: type === FileType.File ? "file" : "folder",
        };
      });
      const has_next_page = rows.length === page_size + 1 && rows[page_size];
      const next_marker = has_next_page ? rows[page_size].name : "";
      const result = {
        items: rows.slice(0, page_size),
        next_marker,
      };
      return Result.Ok(result);
    },
  } as AliyunDriveFolder["client"];
}
