import { PrismaClient } from "@prisma/client";

import { List } from "@/domains/list";
import { Result, resultify, Unpacked } from "@/types";
import { r_id } from "@/utils";
import { AliyunDriveFolder } from "@/domains/aliyundrive/folder";

type PrismaModel =
  | PrismaClient["account"]
  | PrismaClient["asyncTask"]
  | PrismaClient["credential"]
  | PrismaClient["drive"]
  | PrismaClient["driveAnalysis"]
  | PrismaClient["driveCheckIn"]
  | PrismaClient["driveToken"]
  | PrismaClient["episode"]
  | PrismaClient["folder"]
  | PrismaClient["log"]
  | PrismaClient["member"]
  | PrismaClient["memberToken"]
  | PrismaClient["movie"]
  | PrismaClient["playHistory"]
  | PrismaClient["profile"]
  | PrismaClient["recommendedTV"]
  | PrismaClient["searchedTV"]
  | PrismaClient["searchedSeason"]
  | PrismaClient["searchedTVWithName"]
  | PrismaClient["sharedFile"]
  | PrismaClient["sharedFileInProgress"]
  | PrismaClient["tV"]
  | PrismaClient["season"]
  | PrismaClient["tVNeedComplete"]
  | PrismaClient["tmpFolder"]
  | PrismaClient["user"];
export type ModelKeys = keyof Omit<
  PrismaClient,
  | "$on"
  | "$connect"
  | "$disconnect"
  | "$use"
  | "$executeRaw"
  | "$executeRawUnsafe"
  | "$queryRaw"
  | "$queryRawUnsafe"
  | "$transaction"
>;

function add_factory<T extends PrismaClient[ModelKeys]>(model: T, options: Partial<{ safe: boolean }> = {}) {
  const { safe } = options;
  return async (data: Omit<Parameters<T["create"]>[0]["data"], "id">) => {
    try {
      // @ts-ignore
      const created = (await model.create({
        data: {
          id: r_id(),
          ...data,
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
        data,
      });
      return Result.Ok(r);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e);
    }
  };
}
function first_factory<T extends PrismaClient[ModelKeys]>(model: T) {
  return async (where: Parameters<T["update"]>[0]["data"] & { id?: string }) => {
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
    where: Parameters<T["update"]>[0]["data"] & { id?: string },
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
  return async (search: Parameters<T["update"]>[0]["data"] & { id?: string }) => {
    try {
      // @ts-ignore
      const r = await model.delete({
        where: search,
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
    params: Parameters<T["update"]>[0]["data"] & {
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
      search: params,
      sorts,
    });
    const r = await core.fetch();
    return r;
  };
}

export const store_factory = (prisma: PrismaClient) => {
  return {
    prisma,
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
    add_aliyun_drive_token: add_factory<PrismaClient["driveToken"]>(prisma.driveToken),
    update_aliyun_drive_token: update_factory<PrismaClient["driveToken"]>(prisma.driveToken),
    find_aliyun_drive_token: first_factory<PrismaClient["driveToken"]>(prisma.driveToken),
    find_aliyun_drives_token: many_factory<PrismaClient["driveToken"]>(prisma.driveToken),

    add_aliyun_drive: add_factory<PrismaClient["drive"]>(prisma.drive),
    update_aliyun_drive: update_factory<PrismaClient["drive"]>(prisma.drive),
    find_aliyun_drive: first_factory<PrismaClient["drive"]>(prisma.drive),
    find_aliyun_drives: many_factory<PrismaClient["drive"]>(prisma.drive),
    find_aliyun_drives_with_pagination: pagination_factory<PrismaClient["drive"]>(prisma.drive),

    add_async_task: add_factory<PrismaClient["asyncTask"]>(prisma.asyncTask),
    update_async_task: update_factory<PrismaClient["asyncTask"]>(prisma.asyncTask),
    find_async_task: first_factory<PrismaClient["asyncTask"]>(prisma.asyncTask),
    find_async_tasks: many_factory<PrismaClient["asyncTask"]>(prisma.asyncTask),
    delete_async_task: delete_factory<PrismaClient["asyncTask"]>(prisma.asyncTask),
    find_async_task_with_pagination: pagination_factory<PrismaClient["asyncTask"]>(prisma.asyncTask),

    add_check_in: add_factory<PrismaClient["driveCheckIn"]>(prisma.driveCheckIn),

    add_episode: add_factory<PrismaClient["episode"]>(prisma.episode),
    update_episode: update_factory<PrismaClient["episode"]>(prisma.episode),
    delete_episode: delete_factory<PrismaClient["episode"]>(prisma.episode),
    find_episode: first_factory<PrismaClient["episode"]>(prisma.episode),
    find_episodes: many_factory<PrismaClient["episode"]>(prisma.episode),
    find_episodes_with_pagination: pagination_factory<PrismaClient["episode"]>(prisma.episode),

    add_season: add_factory<PrismaClient["season"]>(prisma.season),
    update_season: update_factory<PrismaClient["season"]>(prisma.season),
    delete_season: delete_factory<PrismaClient["season"]>(prisma.season),
    find_season: first_factory<PrismaClient["season"]>(prisma.season),
    find_seasons: many_factory<PrismaClient["season"]>(prisma.season),
    find_seasons_with_pagination: pagination_factory<PrismaClient["season"]>(prisma.season),

    add_history: add_factory<PrismaClient["playHistory"]>(prisma.playHistory),
    update_history: update_factory<PrismaClient["playHistory"]>(prisma.playHistory),
    delete_history: delete_factory<PrismaClient["playHistory"]>(prisma.playHistory),
    find_history: first_factory<PrismaClient["playHistory"]>(prisma.playHistory),
    find_histories: many_factory<PrismaClient["playHistory"]>(prisma.playHistory),
    find_history_with_pagination: pagination_factory<PrismaClient["playHistory"]>(prisma.playHistory),

    add_member_link: add_factory<PrismaClient["memberToken"]>(prisma.memberToken),
    update_member_link: update_factory<PrismaClient["memberToken"]>(prisma.memberToken),
    delete_member_link: delete_factory<PrismaClient["memberToken"]>(prisma.memberToken),
    find_member_link: first_factory<PrismaClient["memberToken"]>(prisma.memberToken),
    find_member_links: many_factory<PrismaClient["memberToken"]>(prisma.memberToken),
    find_member_link_with_pagination: pagination_factory<PrismaClient["memberToken"]>(prisma.memberToken),

    add_member: add_factory<PrismaClient["member"]>(prisma.member),
    update_member: update_factory<PrismaClient["member"]>(prisma.member),
    delete_member: delete_factory<PrismaClient["member"]>(prisma.member),
    find_member: first_factory<PrismaClient["member"]>(prisma.member),
    find_members: many_factory<PrismaClient["member"]>(prisma.member),
    find_member_with_pagination: pagination_factory<PrismaClient["member"]>(prisma.member),

    add_movie: add_factory<PrismaClient["movie"]>(prisma.movie),
    update_movie: update_factory<PrismaClient["movie"]>(prisma.movie),
    find_movie: first_factory<PrismaClient["movie"]>(prisma.movie),
    find_movies: many_factory<PrismaClient["movie"]>(prisma.movie),

    add_recommended_tv: add_factory<PrismaClient["recommendedTV"]>(prisma.recommendedTV),
    update_recommended_tv: update_factory<PrismaClient["recommendedTV"]>(prisma.recommendedTV),
    delete_recommended_tv: delete_factory<PrismaClient["recommendedTV"]>(prisma.recommendedTV),
    find_recommended_tv: first_factory<PrismaClient["recommendedTV"]>(prisma.recommendedTV),
    find_recommended_tvs: many_factory<PrismaClient["recommendedTV"]>(prisma.recommendedTV),
    find_recommended_tv_with_pagination: pagination_factory<PrismaClient["recommendedTV"]>(prisma.recommendedTV),

    add_searched_tv: add_factory<PrismaClient["searchedTV"]>(prisma.searchedTV),
    update_searched_tv: update_factory<PrismaClient["searchedTV"]>(prisma.searchedTV),
    find_searched_tv: first_factory<PrismaClient["searchedTV"]>(prisma.searchedTV),
    find_searched_tvs: many_factory<PrismaClient["searchedTV"]>(prisma.searchedTV),
    find_searched_tv_with_pagination: pagination_factory<PrismaClient["searchedTV"]>(prisma.searchedTV),

    add_shared_files: add_factory<PrismaClient["sharedFile"]>(prisma.sharedFile),
    add_shared_files_safely: async (body: Omit<Parameters<PrismaClient["sharedFile"]["create"]>[0]["data"], "id">) => {
      const { url } = body;
      const existing = await prisma.sharedFile.findFirst({
        where: { url },
      });
      if (existing !== null) {
        return Result.Ok(existing);
      }
      return add_factory<PrismaClient["sharedFile"]>(prisma.sharedFile)(body);
    },
    update_shared_files: update_factory<PrismaClient["sharedFile"]>(prisma.sharedFile),
    delete_shared_files: delete_factory<PrismaClient["sharedFile"]>(prisma.sharedFile),
    find_shared_files: first_factory<PrismaClient["sharedFile"]>(prisma.sharedFile),
    find_shared_files_list: many_factory<PrismaClient["sharedFile"]>(prisma.sharedFile),
    find_shared_files_list_with_pagination: pagination_factory<PrismaClient["sharedFile"]>(prisma.sharedFile),

    add_tv: add_factory<PrismaClient["tV"]>(prisma.tV),
    update_tv: update_factory<PrismaClient["tV"]>(prisma.tV),
    delete_tv: delete_factory<PrismaClient["tV"]>(prisma.tV),
    find_tv: first_factory<PrismaClient["tV"]>(prisma.tV),
    find_tvs: many_factory<PrismaClient["tV"]>(prisma.tV),
    find_tv_with_pagination: pagination_factory<PrismaClient["tV"]>(prisma.tV),

    add_user: add_factory<PrismaClient["user"]>(prisma.user),
    update_user: update_factory<PrismaClient["user"]>(prisma.user),
    delete_user: delete_factory<PrismaClient["user"]>(prisma.user),
    find_user: first_factory<PrismaClient["user"]>(prisma.user),
    find_users: many_factory<PrismaClient["user"]>(prisma.user),
    find_user_with_pagination: pagination_factory<PrismaClient["user"]>(prisma.user),

    add_folder: add_factory<PrismaClient["folder"]>(prisma.folder),
    update_folder: update_factory<PrismaClient["folder"]>(prisma.folder),
    delete_folder: delete_factory<PrismaClient["folder"]>(prisma.folder),
    find_folder: first_factory<PrismaClient["folder"]>(prisma.folder),
    find_folders: many_factory<PrismaClient["folder"]>(prisma.folder),
    find_folder_with_pagination: pagination_factory<PrismaClient["folder"]>(prisma.folder),

    add_tmp_folder: add_factory<PrismaClient["tmpFolder"]>(prisma.tmpFolder),
    update_tmp_folder: update_factory<PrismaClient["tmpFolder"]>(prisma.tmpFolder),
    delete_tmp_folder: delete_factory<PrismaClient["tmpFolder"]>(prisma.tmpFolder),
    find_tmp_folder: first_factory<PrismaClient["tmpFolder"]>(prisma.tmpFolder),
    find_tmp_folders: many_factory<PrismaClient["tmpFolder"]>(prisma.tmpFolder),
    find_tmp_folder_with_pagination: pagination_factory<PrismaClient["tmpFolder"]>(prisma.tmpFolder),

    add_shared_files_in_progress: add_factory<PrismaClient["sharedFileInProgress"]>(prisma.sharedFileInProgress),
    update_shared_files_in_progress: update_factory<PrismaClient["sharedFileInProgress"]>(prisma.sharedFileInProgress),
    delete_shared_files_in_progress: delete_factory<PrismaClient["sharedFileInProgress"]>(prisma.sharedFileInProgress),
    find_shared_files_in_progress: first_factory<PrismaClient["sharedFileInProgress"]>(prisma.sharedFileInProgress),
    find_shared_files_list_in_progress: many_factory<PrismaClient["sharedFileInProgress"]>(prisma.sharedFileInProgress),
    find_shared_files_in_progress_with_pagination: pagination_factory<PrismaClient["sharedFileInProgress"]>(
      prisma.sharedFileInProgress
    ),

    add_searched_season: add_factory<PrismaClient["searchedSeason"]>(prisma.searchedSeason),
    update_searched_season: update_factory<PrismaClient["searchedSeason"]>(prisma.searchedSeason),
    find_searched_season: first_factory<PrismaClient["searchedSeason"]>(prisma.searchedSeason),
    find_searched_season_list: many_factory<PrismaClient["searchedSeason"]>(prisma.searchedSeason),
    find_searched_season_with_pagination: pagination_factory<PrismaClient["searchedSeason"]>(prisma.searchedSeason),

    add_tv_need_complete: add_factory<PrismaClient["tVNeedComplete"]>(prisma.tVNeedComplete),
    update_tv_need_complete: update_factory<PrismaClient["tVNeedComplete"]>(prisma.tVNeedComplete),
    delete_tv_need_complete: delete_factory<PrismaClient["tVNeedComplete"]>(prisma.tVNeedComplete),
    find_tv_need_complete: first_factory<PrismaClient["tVNeedComplete"]>(prisma.tVNeedComplete),
    find_tv_need_complete_list: many_factory<PrismaClient["tVNeedComplete"]>(prisma.tVNeedComplete),
    find_tv_need_complete_with_pagination: pagination_factory<PrismaClient["tVNeedComplete"]>(prisma.tVNeedComplete),
  };
};

export const store = store_factory(new PrismaClient());

/**
 * 本地存储的 folder client，和 drive client 等同使用
 * @param body
 * @param store
 * @returns
 */
export function folder_client(body: { drive_id: string }, store: ReturnType<typeof store_factory>) {
  const { drive_id } = body;
  return {
    async fetch_file(id: string) {
      const r = await store.find_folder({ file_id: id, drive_id });
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
      const r = await resultify(store.prisma.folder.findMany.bind(store.prisma.folder))({
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
        // console.log("happen error", r.error.message);
        return r;
      }
      const rows = r.data.map((f) => {
        const { file_id, parent_file_id, name, type } = f;
        return {
          file_id,
          parent_file_id,
          name,
          type: type === 1 ? "file" : "folder",
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
