import { RequestedResource } from "@/types";
import { request } from "@/utils/request";

/**
 * 查询异步任务状态
 */
export function fetch_async_task(id: string) {
  return request.get<{ id: string; status: string; desc: string }>(
    `/api/task/${id}`
  );
}
export type PartialAsyncTask = RequestedResource<typeof fetch_async_task>;
