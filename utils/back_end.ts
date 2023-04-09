/**
 * @file 只在后端使用的工具方法
 */
import fs from "fs/promises";
import path from "path";
import http from "http";

import FormData from "form-data";
import qiniu from "qiniu";
import axios from "axios";

import { Result } from "@/types";
import { accessSync, mkdirSync, ReadStream } from "fs";
import { random_string } from ".";

export async function ensure(filepath: string, next: string[] = []) {
  const { ext, dir } = path.parse(filepath);
  const isFile = ext !== undefined && ext !== "";
  if (isFile) {
    filepath = dir;
  }
  try {
    await fs.access(filepath);
    if (next.length !== 0) {
      const theDirPrepareCreate = next.pop();
      await fs.mkdir(theDirPrepareCreate!);
      await ensure(filepath, next);
    }
  } catch {
    const needToCreate = path.dirname(filepath);
    await ensure(needToCreate, next.concat(filepath));
  }
}

export function ensure_sync(filepath: string, next: string[] = []) {
  const { ext, dir } = path.parse(filepath);
  const isFile = ext !== undefined && ext !== "";
  if (isFile) {
    filepath = dir;
  }
  try {
    accessSync(filepath);
    if (next.length !== 0) {
      const theDirPrepareCreate = next.pop();
      mkdirSync(theDirPrepareCreate!);
      ensure_sync(filepath, next);
    }
  } catch {
    const needToCreate = path.dirname(filepath);
    ensure_sync(needToCreate, next.concat(filepath));
  }
}

export async function existing(pathname: string) {
  try {
    await fs.stat(pathname);
    return true;
  } catch (err) {
    return false;
  }
}

async function request_online_url_to_stream(url: string) {
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

export async function ali_upload_online_file(online_url: string) {
  const file_resp = await request_online_url_to_stream(online_url);
  if (file_resp.error) {
    return file_resp;
  }
  const form = new FormData();
  const file = file_resp.data;
  form.append("file", file);
  form.append("ctoken", "eAT1nRkx-4kuLLll6IyWMSMfB-4MMWY6aplY");
  const headers = form.getHeaders();
  const promise: Promise<
    Result<{ url: string; size: number; width: number; height: number }>
  > = new Promise((resolve) => {
    const req = http.request(
      {
        method: "post",
        host: "www.imgcook.com",
        path: "/api/upload-img",
        headers: headers,
      },
      (resp) => {
        let str = "";
        resp.on("data", (buffer) => {
          str += buffer;
        });
        resp.on("end", () => {
          const result = JSON.parse(str);
          const { status, data } = result;
          const { url, size, width, height } = data;
          if (!status) {
            return resolve(Result.Err("upload file failed"));
          }
          resolve(Result.Ok({ url, size, width, height }));
        });
        resp.on("error", () => {
          resolve(Result.Err("upload file failed"));
        });
      }
    );
    form.pipe(req);
  });
  return promise;
}

const put_policy = new qiniu.rs.PutPolicy({
  scope: process.env.QINIU_SCOPE,
});
const qiniu_token = put_policy.uploadToken(
  new qiniu.auth.digest.Mac(
    process.env.QINIU_ACCESS_TOKEN,
    process.env.QINIU_SECRET_TOKEN
  )
);
const config = new qiniu.conf.Config();
// @ts-ignore
config.zone = qiniu.zone.Zone_z2;
const form_uploader = new qiniu.form_up.FormUploader(config);
const put_extra = new qiniu.form_up.PutExtra();

/**
 *
 * 将静态资源上传至 cdn
 * @doc https://developer.qiniu.com/kodo/sdk/nodejs
 * @param online_url
 * @returns
 */
export async function qiniu_upload_online_file(
  online_url: string,
  /** 文件路径 */
  unique?: string | number
) {
  const file_resp = await request_online_url_to_stream(online_url);
  if (file_resp.error) {
    return file_resp;
  }
  const random = random_string(16);
  const key = `video-static${unique || random}`;
  const file = file_resp.data;
  const p: Promise<Result<{ url: string }>> = new Promise((resolve) => {
    form_uploader.putStream(
      qiniu_token,
      key,
      file,
      put_extra,
      (err, body, resp) => {
        if (err) {
          return resolve(Result.Err(err.message));
        }
        if (resp.statusCode == 200) {
          return resolve(Result.Ok(add_url(body)));
        }
        return resolve(Result.Err(body));
      }
    );
  });
  return p;
}

/**
 * 添加域名
 * @param body
 * @returns
 */
function add_url(body: { key: string }) {
  // console.log("[addUrl]", body.key);
  return { ...body, url: `//static.funzm.com/${body.key}` };
}
/**
 * 上传本地文件
 * @param filepath 本地文件路径
 * @param extra_options
 * @returns
 */
export function upload_local_file_to_qiniu(
  filepath: string,
  extra_options: Partial<{
    hash: string;
    replacement: (key: string) => string;
  }> = {}
) {
  const { hash, replacement } = extra_options;
  return new Promise((resolve, reject) => {
    const { dir, base } = path.parse(filepath);
    const key = `${hash}/${base}`;
    form_uploader.putFile(
      qiniu_token,
      replacement ? replacement(key) : key,
      filepath,
      put_extra,
      (respErr, respBody, respInfo) => {
        if (respErr) {
          reject(respErr);
          return;
        }
        if (respInfo.statusCode == 200) {
          resolve(add_url(respBody));
          return;
        }
        reject(respBody);
      }
    );
  });
}

async function is_file(dir: string) {
  try {
    const stats = await fs.stat(dir);
    if (stats.isFile()) {
      return true;
    }
  } catch (err) {
    // ...
  }
  return false;
}

const ignore = [".DS_Store"];

async function get_files(dir: string) {
  let files = await fs.readdir(dir);
  files = files
    .filter((file) => !ignore.includes(file))
    .map((file) => `${dir}/${file}`);
  let result: {}[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    if (await is_file(file)) {
      result.push(file);
    } else {
      result = result.concat(get_files(file));
    }
  }
  return result;
}
