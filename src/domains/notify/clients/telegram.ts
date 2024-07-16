/**
 * telegram 消息推送
 * @doc https://core.telegram.org/bots/api
 */
import axios from "axios";
import qs from "qs";

import { Result } from "@/domains/result/index";

import { SendPayload } from "../types";

export async function telegram_send(body: SendPayload, token: string) {
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
      return qs.stringify(query);
    }
    if (image) {
      query.text = image;
      query.type = "image";
      return qs.stringify(query);
    }
    query.text = title;
    query.desp = markdown;
    query.type = "markdown";
    return qs.stringify(query);
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
