import { ReadStream, createWriteStream, writeFileSync, unlink } from "fs";

import axios from "axios";

import { Result } from "@/types";
import { ensure } from "@/utils/back_end";

export class ImageUploader {
  /** 网络地址转成 Stream 流 */
  async request_online_url_to_stream(url: string) {
    try {
      const { data } = await axios.get<ReadStream>(url, {
        responseType: "stream",
      });
      return Result.Ok(data);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e.message);
    }
  }
  upload(url: string, name: string) {}
  /** 从 Stream 流生成图片保存至本地 */
  async generate_file_from_stream(filepath: string, stream: ReadStream): Promise<Result<string>> {
    return new Promise((resolve) => {
      const writeStream = createWriteStream(filepath);
      stream.pipe(writeStream);
      writeStream.on("finish", () => {
        resolve(Result.Ok(filepath));
      });
      writeStream.on("error", (error) => {
        const e = error as Error;
        resolve(Result.Err(e.message));
      });
    });
  }
  /** 下载网络图片到本地 */
  async download(url: string, dest: string): Promise<Result<string>> {
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });
    return new Promise((resolve) => {
      response.data
        .pipe(createWriteStream(dest))
        .on("error", (err: Error) => {
          resolve(Result.Err(err.message));
        })
        .once("close", () => resolve(Result.Ok(dest)));
    });
  }
  /** 删除本地图片 */
  async delete(key: string) {
    return new Promise((resolve) => {
      unlink(key, (err) => {
        if (err) {
          resolve(Result.Err(err.message));
          return;
        }
        return Result.Ok(null);
      });
    });
  }
}
