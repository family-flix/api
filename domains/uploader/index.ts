/**
 * @file 本地文件管理
 * 1、将网络图片下载至本地
 * 2、将二进制文件保存至本地
 */
import { rename, ReadStream, createWriteStream, writeFileSync, unlink } from "fs";
import path from "path";

import axios from "axios";

import { check_existing, copy, ensure } from "@/utils/fs";
import { Result } from "@/types";

export class FileManage {
  static ensure(filepath: string) {
    return ensure(filepath);
  }

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
        timeout: 6000,
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
  /** 上传字幕文件 */
  upload_subtitle(filepath: string, filename: string): Promise<Result<string>> {
    return new Promise((resolve) => {
      const subtitle_path = path.resolve(this.root, "subtitle", filename);
      rename(filepath, subtitle_path, (err) => {
        if (err) {
          return resolve(Result.Err(err.message));
        }
        return resolve(Result.Ok("/" + path.relative(path.resolve(this.root), subtitle_path)));
      });
    });
  }
  /** 删除字幕文件 */
  delete_subtitle(filename: string): Promise<Result<string>> {
    return new Promise((resolve) => {
      const subtitle_path = path.resolve(this.root, "subtitle", filename);
      unlink(subtitle_path, (err) => {
        if (err) {
          return resolve(Result.Err(err.message));
        }
        return resolve(Result.Ok("/" + path.relative(path.resolve(this.root), subtitle_path)));
      });
    });
  }
  async copy_local_file(file: string, filename: string, parent_dir: string): Promise<Result<string>> {
    const filepath = path.resolve(this.root, parent_dir, filename);
    const r = await copy(file, filepath);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const result = "/" + path.relative(path.resolve(this.root), filepath);
    // console.log("copy_local_file success", result);
    return Result.Ok(result);
  }
  /** 下载网络文件到本地 */
  async download(url: string, key: string, options: Partial<{ is_fullpath: boolean }> = {}): Promise<Result<string>> {
    try {
      const filepath = options.is_fullpath ? key : path.join(this.root, key);
      const r = await check_existing(filepath);
      if (r.error) {
        return Result.Err(r.error.message);
      }
      if (r.data) {
        return Result.Ok(key);
      }
      // console.log("[DOMAIN]Uploader - before request");
      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
        timeout: 6000,
      });
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
    } catch (err) {
      const e = err as Error;
      // console.log("[DOMAIN]Uploader - request failed", e.message);
      return Promise.resolve(Result.Err(e.message));
    }
  }
  /** 删除本地文件 */
  async delete_file(key: string) {
    const filepath = path.join(this.root, key);
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
