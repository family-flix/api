/**
 * @file 图片上传器
 */
import { ReadStream, createWriteStream, writeFileSync, unlink } from "fs";
import { join } from "path";

import axios from "@/modules/axios";
import { Result } from "@/types";

export class ImageUploader {
  root: string;

  constructor(options: { root: string }) {
    const { root } = options;
    this.root = root;
  }
  /** 网络地址转成 Stream 流 */
  async online_url_to_stream(url: string) {
    try {
      const { data } = (await axios.get(url, {
        responseType: "stream",
      })) as { data: ReadStream };
      return Result.Ok(data);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e.message);
    }
  }
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
  upload(url: string, name: string) {}
  /** 下载网络图片到本地 */
  async download(url: string, key: string): Promise<Result<string>> {
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });
    const filepath = join(this.root, key);
    // console.log("[DOMAIN]Uploader - download", filepath);
    return new Promise((resolve) => {
      response.data
        .pipe(createWriteStream(filepath))
        .on("error", (err: Error) => {
          // console.log("[DOMAIN]Uploader - download failed", err.message);
          resolve(Result.Err(err.message));
        })
        .once("close", () => {
          // console.log("[DOMAIN]Uploader - download success", key);
          resolve(Result.Ok(key));
        });
    });
  }
  /** 删除本地图片 */
  async delete(key: string) {
    const filepath = join(this.root, key);
    return new Promise((resolve) => {
      unlink(filepath, (err) => {
        if (err) {
          resolve(Result.Err(err.message));
          return;
        }
        return Result.Ok(null);
      });
    });
  }
}
