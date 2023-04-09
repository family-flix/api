import {
  ListResponse,
  RequestedResource,
  Result,
  Unpacked,
  UnpackedResult,
} from "@/types";
import { request } from "@/utils/request";
import { FetchParams } from "@/domains/list-helper-core";
import dayjs from "dayjs";

/**
 * 开始对分享的文件进行分析
 */
export function start_shared_files_analysis_task(url: string) {
  return request.get<{ async_task_id: string }>(`/api/task/start?url=${url}`);
}
/**
 * 查询异步任务状态
 */
export function fetch_async_task(id: string) {
  return request.get<{ id: string; status: string }>(`/api/task/${id}`);
}
/**
 * 获取当前用户所有异步任务
 */
export async function fetch_async_tasks(params: FetchParams) {
  const resp = await request.get<
    ListResponse<{
      id: string;
      unique_id: string;
      status: string;
      desc: string;
      created: string;
    }>
  >(`/api/task/list`, params);
  if (resp.error) {
    return Result.Err(resp.error);
  }
  const result = {
    ...resp.data,
    list: resp.data.list.map((task) => {
      const { created, ...rest } = task;
      return {
        ...rest,
        created: dayjs(created).format("YYYY-MM-DD HH:mm:ss"),
      };
    }),
  };
  return Result.Ok(result);
}
export type AsyncTask = RequestedResource<typeof fetch_async_tasks>["list"][0];

export function stop_async_task(id: string) {
  return request.get<{ id: string }>(`/api/task/stop/${id}`);
}

export function fetch_async_task_profile(id: string) {
  return request.get<{
    id: string;
    desc: string;
    list: {
      async_task_id: string;
      id: string;
      name: string;
      original_name: string;
      overview: string;
      poster_path: string;
      size_count: string;
      folder_id: string;
      in_same_root_folder: boolean;
      seasons: {
        id: string;
        season: string;
        folders: {
          folder: string;
          resolution: string;
          episodes: {
            id: string;
            file_id: string;
            file_path: string;
            episode: string;
          }[];
        }[];
      }[];
    }[];
  }>(`/api/task/result/${id}`);
}

export type TaskResultOfSharedTV = UnpackedResult<
  Unpacked<ReturnType<typeof fetch_async_task_profile>>
>;

export function complete_async_task(
  id: string,
  options: {
    action: "save" | "drop";
    folder_id: string;
    tv_id: string;
    drive_id?: string;
  }
) {
  const { action, drive_id, tv_id, folder_id } = options;
  return request.get(
    `/api/task/complete/${id}?action=${action}&drive_id=${drive_id}&folder_id=${folder_id}&tv_id=${tv_id}`
  );
}
