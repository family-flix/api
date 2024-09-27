/**
 * wxpush 消息推送
 * @doc https://wxpusher.zjiecode.com/docs/#/?id=spt
 */
import axios from "axios";

import { Result } from "@/domains/result/index";

import { SendPayload } from "../types";

function markdownToHtml(markdown: string) {
  // 转换标题
  markdown = markdown.replace(/###### (.*)/g, "<h6>$1</h6>");
  markdown = markdown.replace(/##### (.*)/g, "<h5>$1</h5>");
  markdown = markdown.replace(/#### (.*)/g, "<h4>$1</h4>");
  markdown = markdown.replace(/### (.*)/g, "<h3>$1</h3>");
  markdown = markdown.replace(/## (.*)/g, "<h2>$1</h2>");
  markdown = markdown.replace(/# (.*)/g, "<h1>$1</h1>");

  // 转换粗体和斜体
  markdown = markdown.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  markdown = markdown.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // 转换链接
  markdown = markdown.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  // 转换换行
  markdown = markdown.replace(/\n/g, "<br>");

  // 转换无序列表
  markdown = markdown.replace(/^\s*\*\s+(.*)/gm, "<ul><li>$1</li></ul>");
  markdown = markdown.replace(/<\/ul>\s*<ul>/g, ""); // 合并相邻的<ul>

  // 转换有序列表
  markdown = markdown.replace(/^\s*\d+\.\s+(.*)/gm, "<ol><li>$1</li></ol>");
  markdown = markdown.replace(/<\/ol>\s*<ol>/g, ""); // 合并相邻的<ol>

  return markdown.trim();
}

export async function wxpush_send(body: SendPayload, token: string) {
  console.log("[DOMAIN]notify/clients/wxpush", body, token);
  const { text, image, title = "通知", markdown } = body;
  if (!token) {
    return Result.Err("缺少 pushkey");
  }
  const query: {
    summary: string;
    content: string;
    spt: string;
    contentType: 1 | 2 | 3;
  } = {
    summary: "",
    content: "",
    spt: token,
    contentType: 2,
  };
  // const token = 'SPT_0qWfuNjyn8AStzEcs1QE80JSPO3c';
  // const endpoint = `https://wxpusher.zjiecode.com/api/send/message/${token}`;
  const endpoint = `https://wxpusher.zjiecode.com/api/send/message/simple-push`;
  const data = (() => {
    if (text) {
      query.contentType = 1;
      query.summary = text;
      query.content = text;
      return query;
    }
    if (markdown) {
      query.summary = title;
      query.content = markdownToHtml(markdown);
      return query;
    }
    return null;
  })();
  if (!data) {
    return Result.Err("缺少消息内容");
  }
  console.log('[DOMAIN]notify/clients/wxpush', data);
  try {
    const r = await axios.post(`${endpoint}`, data);
    if (r.data.code !== 1000) {
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
