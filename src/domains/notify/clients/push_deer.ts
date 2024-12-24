/**
 * pushdeer 消息推送
 * @doc https://www.pushdeer.com/official.html
 */
import axios from "axios";

import { Result } from "@/domains/result/index";
import { query_stringify } from "@/utils/index";

import { SendPayload } from "../types";

export async function pushdeer_send(body: SendPayload, token: string) {
  // console.log('[DOMAIN]notify/clients/push_deer', body, token);
  const { text, image, title = "通知", markdown } = body;
  if (!token) {
    return Result.Err("缺少 pushkey");
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
      return query_stringify(query);
    }
    if (image) {
      query.text = image;
      query.type = "image";
      return query_stringify(query);
    }
    query.text = title;
    query.desp = markdown;
    query.type = "markdown";
    return query_stringify(query);
  })();
  // console.log('[DOMAIN]notify/clients/push_deer', search);
  try {
    const r = await axios.get(`${endpoint}?${search}`);
    if (r.data.code !== 0) {
      return Result.Err(r.data.error);
    }
    return Result.Ok("push success");
  } catch (err) {
    const error = err as any;
    const { response, message } = error;
    console.log(response.data, message);
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
// export function notice_error(result: Result<unknown> | string | Error, reason: string = "") {
//   if (typeof result === "string") {
//     return notice_push_deer({
//       title: "ERROR",
//       markdown: reason + result,
//     });
//   }
//   if (result instanceof Error) {
//     return notice_push_deer({
//       title: "ERROR",
//       markdown: reason + result.message,
//     });
//   }
//   const msg = result.error === null ? "Unknown error?" : result.error.message;
//   return notice_push_deer({
//     title: "ERROR",
//     markdown: reason + msg,
//   });
// }
