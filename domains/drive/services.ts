/**
 * @file 网盘相关 service
 */
import { request } from "@/utils/request";
import { bytes_to_size } from "@/utils";
import { FetchParams } from "@/domains/list-helper-core";
import { ListResponse, RequestedResource, Result } from "@/types";

/**
 * 新增阿里云盘
 * @param body
 * @returns
 */
export async function add_aliyun_drive(body: { payload: string }) {
  // console.log("[]add_aliyun_drive params", body);
  return await request.post<{ id: string }>("/api/drive/add", body);
}

/**
 * 更新阿里云盘信息
 * @param id
 * @param body
 * @returns
 */
export function update_aliyun_drive(id: string, body: Record<string, unknown>) {
  return request.post<{ id: string }>(`/api/drive/update/${id}`, body);
}

/**
 * 获取阿里云盘列表
 * @param params
 * @returns
 */
export async function fetch_aliyun_drives(params: FetchParams) {
  const resp = await request.get<
    ListResponse<{
      id: string;
      name: string;
      /** 这个是一定存在的 */
      user_name: string;
      nick_name: string;
      avatar: string;
      used_size: number;
      total_size: number;
    }>
  >("/api/drive/list", params);
  if (resp.error) {
    return resp;
  }
  return Result.Ok({
    ...resp.data,
    list: resp.data.list.map((item) => {
      const { id, name, avatar, nick_name, user_name, total_size, used_size } =
        item;
      return {
        id,
        name: name || user_name || nick_name,
        user_name,
        avatar,
        total_size: bytes_to_size(total_size),
        used_size: bytes_to_size(used_size),
      };
    }),
  });
}
export type AliyunDriveItem = RequestedResource<
  typeof fetch_aliyun_drives
>["list"][0];

/**
 * 刷新阿里云盘信息
 * @param body
 * @returns
 */
export async function refresh_aliyun_drive(body: { aliyun_drive_id: string }) {
  const { aliyun_drive_id } = body;
  return await request.get<AliyunDriveItem & {}>(
    `/api/drive/refresh/${aliyun_drive_id}`
  );
}

/**
 * 在 TMDB 刮削索引到的影视剧信息
 * @param body
 * @returns
 */
export async function analysis_aliyun_drive(body: {
  aliyun_drive_id: string;
  target_folder?: string;
}) {
  const { aliyun_drive_id, target_folder } = body;
  return request.get<{ async_task_id: string }>(
    `/api/drive/analysis/${aliyun_drive_id}`,
    { target_folder }
  );
}

/**
 * 在 TMDB 刮削索引到的影视剧信息
 * @param body
 * @returns
 */
export async function scrape_aliyun_drive(body: { aliyun_drive_id: string }) {
  const { aliyun_drive_id } = body;
  return request.get<{ async_task_id: string }>(
    `/api/drive/scrape/${aliyun_drive_id}`
  );
}

export async function fetch_aliyun_drive_profile(body: { id: string }) {
  const { id } = body;
  return request.get<{ id: string; root_folder_id: string }>(
    `/api/drive/${id}`
  );
}
export type AliyunDriveProfile = RequestedResource<
  typeof fetch_aliyun_drive_profile
>;

/**
 * 指定阿里云盘合并同名电视剧
 * @deprecated 直接索引就可以了
 * @param body
 * @returns
 */
export async function merge_same_tv_for_aliyun_drive(body: {
  aliyun_drive_id: string;
}) {
  const { aliyun_drive_id } = body;
  return await request.get<void>(`/api/drive/merge/${aliyun_drive_id}`);
}

/**
 * 删除指定云盘
 * @param body
 * @returns
 */
export function delete_aliyun_drive(body: { id: string }) {
  const { id } = body;
  return request.get(`/api/drive/delete/${id}`);
}

/**
 * 导出云盘信息
 * @param id
 * @returns
 */
export async function export_aliyun_drive(body: { aliyun_drive_id: string }) {
  const { aliyun_drive_id } = body;
  return await request.get<{
    app_id: string;
    drive_id: string;
    device_id: string;
    access_token: string;
    refresh_token: string;
    avatar: string;
    nick_name: string;
    aliyun_user_id: string;
    user_name: string;
    root_folder_id?: string;
    total_size?: number;
    used_size?: number;
  }>(`/api/drive/export/${aliyun_drive_id}`);
}

/**
 * 更新阿里云盘 refresh_token
 */
export async function update_drive_refresh_token(body: {
  drive_id: string;
  refresh_token: string;
}) {
  const { drive_id, refresh_token } = body;
  const r = await request.post(`/api/drive/token/${drive_id}`, {
    refresh_token,
  });
  if (r.error) {
    return r;
  }
  return r;
}
