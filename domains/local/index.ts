import fs from "fs/promises";
import os from "os";
import path from "path";

import { Result } from "@/types";

export class LocalFileClient {
  constructor() {}

  async fetch_files(
    /** 该文件夹下的文件列表，默认 root 表示根目录 */
    file_id?: string
  ) {
    const filepath = (() => {
      const homedir = os.homedir();
      if (!file_id || file_id === "root") {
        return homedir;
      }
      return file_id;
    })();
    const r = await fs.readdir(filepath);
    return Result.Ok({
      items: r.map((sub_filepath) => {
        return {
          id: sub_filepath,
          parent_paths: filepath,
        };
      }),
    });
  }
}
