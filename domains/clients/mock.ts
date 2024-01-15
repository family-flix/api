/**
 * mock 数据的 client，和 drive client 等同使用
 */
import { RequestedAliyunDriveFiles } from "@/domains/walker/utils";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { AliyunDriveFileResp } from "@/domains/aliyundrive/types";
import { Result } from "@/types";

export class MockFileClient implements AliyunDriveClient {
  tree: RequestedAliyunDriveFiles;
  size = 10;
  constructor(props: { data: RequestedAliyunDriveFiles }) {
    const { data } = props;

    this.tree = data;
  }
  // @ts-ignore
  fetch_files(
    /** 该文件夹下的文件列表，默认 root 表示根目录 */
    file_id: string = "root",
    options: Partial<{
      /** 每页数量 */
      page_size: number;
      /** 下一页标志 */
      marker: string;
      sort: { field: "name" | "updated_at" | "size"; order: "asc" | "desc" }[];
    }> = {}
  ) {
    const { marker, page_size: size = 20 } = options;
    // console.log("[](fake fetchFiles)", id, marker);
    const matched = find_child_recursive(this.tree, file_id);
    if (matched) {
      const { items = [] } = matched;
      const first_items_result = {
        items: items.slice(0 * 1, (0 + 1) * size),
        next_marker: items.length > (0 + 1) * size ? "p1" : "",
      };
      if (marker) {
        const p = marker.match(/[0-9]{1,}/);
        if (p === undefined) {
          return Promise.resolve(Result.Ok(first_items_result));
        }
        const page = Number(p);
        return Promise.resolve(
          Result.Ok({
            items: items.slice(page * size, (page + 1) * size) as AliyunDriveFileResp[],
            next_marker: items.length > (page + 1) * size ? `p${page + 1}` : "",
          })
        );
      }
      return Promise.resolve(Result.Ok(first_items_result));
    }
    return Promise.resolve(
      Result.Ok({
        items: [],
        next_marker: null,
      })
    );
  }
  // @ts-ignore
  fetch_file(file_id: string): Promise<Result<AliyunDriveFileResp>> {
    const result = find_child_recursive(this.tree, file_id);
    if (result === null) {
      return Promise.resolve(Result.Err("404"));
    }
    return Promise.resolve(Result.Ok(result as AliyunDriveFileResp));
  }
}

function find_child_recursive(file: RequestedAliyunDriveFiles, id: string): RequestedAliyunDriveFiles | null {
  const { file_id, items } = file;
  if (file_id === id) {
    return file;
  }
  if (!items) {
    return null;
  }
  for (let i = 0; i < items.length; i += 1) {
    const matched = find_child_recursive(items[i], id);
    if (matched) {
      return matched;
    }
  }
  return null;
}
