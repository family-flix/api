import { GenreDriveFile, RequestedAliyunDriveFiles } from "@/domains/clients/types";
import { Result, Unpacked } from "@/types/index";

const DefaultDriveFile = {
  url: "",
  size: 0,
  mime_type: null,
  md5: null,
  content_hash: null,
  thumbnail: null,
};
export function build_drive_file(partial: {
  file_id: string;
  name: string;
  parent_file_id: string;
  type: string;
  size?: number;
  mime_type?: string;
  md5?: string;
  content_hash?: string;
  thumbnail?: string;
  url?: string;
}): GenreDriveFile {
  return {
    ...DefaultDriveFile,
    ...partial,
  };
}
type PartialGenreDriveFile = {
  file_id: string;
  parent_file_id: string;
  name: string;
  type: string;
  items: PartialGenreDriveFile[];
};
type GenreDriveFileTree = {
  file_id: string;
  parent_file_id: string;
  name: string;
  type: string;
  items?: GenreDriveFileTree[];
};
export function patch_drive_file(data: GenreDriveFileTree): RequestedAliyunDriveFiles {
  return {
    ...build_drive_file(data),
    items: data.items
      ? data.items.map((item) => {
          return patch_drive_file(item);
        })
      : [],
  };
}

export function run<T extends (...args: any[]) => Promise<{ error: Error | null; finished: boolean; data: any }>>(
  fn: T,
  options: Partial<{
    timeout: number;
    times: number;
  }> = {}
) {
  const { timeout, times } = options;
  let start = new Date().valueOf();
  function _run<T extends (...args: any[]) => Promise<{ error: Error | null; finished: boolean; data: any }>>(
    fn: T,
    resolve: (data: Unpacked<ReturnType<T>>["data"]) => void
  ) {
    fn().then((res) => {
      if (res.error) {
        resolve(Result.Err(res.error));
        return;
      }
      const now = new Date().valueOf();
      if (timeout !== undefined && now - start >= timeout) {
        resolve(Result.Err(new Error("超时未完成")));
        return;
      }
      if (!res.finished) {
        _run(fn, resolve);
        return;
      }
      resolve(Result.Ok(res.data));
    });
  }
  const p = new Promise((resolve) => {
    _run(fn, resolve);
  }) as Promise<Result<Unpacked<ReturnType<T>>["data"]>>;
  return p;
}
