/**
 * @doc https://www.pushdeer.com/official.html
 */
require("dotenv").config();
import axios from "axios";
import qs from "qs";

import { Result } from "@/types";

export async function notice_push_deer(
  body: Partial<{ text: string; url: string; title: string; markdown: string }>
) {
  const { text, url, title = "通知", markdown } = body;
  const token = process.env.PUSH_DEER_TOKEN;
  if (!token) {
    return Result.Err("Missing pushkey");
  }
  const query: {
    pushkey: string;
    text?: string;
    type?: string;
    desp?: string;
  } = {
    pushkey: token,
  };
  const endpoint = `https://api2.pushdeer.com/message/push`;
  const search = (() => {
    if (text) {
      query.text = text;
      return qs.stringify(query);
    }
    if (url) {
      query.text = url;
      query.type = "image";
      return qs.stringify(query);
    }
    query.text = title;
    query.desp = markdown;
    query.type = "markdown";
    return qs.stringify(query);
  })();
  try {
    const r = await axios.get(`${endpoint}?${search}`);
    if (r.data.code !== 0) {
      return Result.Err(r.data.error);
    }
    return Result.Ok("push success");
  } catch (err) {
    // ...
    console.log(err);
  }
  return Result.Err("Request failed");
}

// 纯文本
// notice_push_deer({ text: "hello" });

// 图片
// notice_push_deer({
//   url: "http://static.funzm.com/video-static/poster/9BuqJLSKqVyW0F2S",
// });

// markdown

// notice_push_deer({
//   title: "影片更新提示",
//   markdown: `## 2023/03/10 新增影片\n1. 去往有风的地方\n![去往有风的地方](http://static.funzm.com/video-static/poster/9BuqJLSKqVyW0F2S)`,
// });

/**
 * 向 push deer 推送错误提示信息
 */
export function notice_error(result: Result<unknown> | string | Error) {
  if (typeof result === "string") {
    return notice_push_deer({
      title: "ERROR",
      markdown: result,
    });
  }
  if (result instanceof Error) {
    return notice_push_deer({
      title: "ERROR",
      markdown: result.message,
    });
  }
  const msg = result.error === null ? "Unknown error?" : result.error.message;
  return notice_push_deer({
    title: "ERROR",
    markdown: msg,
  });
}
