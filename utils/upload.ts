import { ReadStream } from "fs";

import qiniu from "qiniu";
import axios from "axios";

import { Result } from "@/types";

import { random_string } from ".";

async function request_online_url_to_stream(url: string) {
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

const put_policy = new qiniu.rs.PutPolicy({
  scope: process.env.QINIU_SCOPE,
});
const qiniu_token = put_policy.uploadToken(
  new qiniu.auth.digest.Mac(process.env.QINIU_ACCESS_TOKEN, process.env.QINIU_SECRET_TOKEN)
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
  const file_res = await request_online_url_to_stream(online_url);
  if (file_res.error) {
    return Result.Err(file_res.error);
  }
  const random = random_string(16);
  const key = `video-static${unique || random}`;
  const file = file_res.data;
  const p: Promise<Result<{ url: string }>> = new Promise((resolve) => {
    form_uploader.putStream(qiniu_token, key, file, put_extra, (err, body, resp) => {
      if (err) {
        return resolve(Result.Err(err.message));
      }
      if (resp.statusCode == 200) {
        return resolve(Result.Ok(add_url(body)));
      }
      return resolve(Result.Err(body));
    });
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
