/**
 * @file 短链服务
 */
import axios from "axios";

import { Result } from "@/types";
import { query_stringify } from "@/utils";
import { app } from "@/store";

const API_HOST = "http://t.funzm.com";
const client = axios.create({
  baseURL: API_HOST,
  timeout: 6000,
});
type RequestClient = {
  get: <T>(url: string, query?: Record<string, string | number | undefined>) => Promise<Result<T>>;
  post: <T>(url: string, body: Record<string, string | number | undefined>) => Promise<Result<T>>;
};
const request: RequestClient = {
  get: async <T extends null>(endpoint: string, query?: Record<string, string | number | undefined>) => {
    try {
      const url = `${endpoint}${query ? "?" + query_stringify(query) : ""}`;
      // console.log("[LOG](request)", "get", API_HOST + url);
      const resp = await client.get(url);
      return Result.Ok<T>(resp.data);
    } catch (err) {
      const error = err as Error;
      return Result.Err(error.message);
    }
  },
  post: async <T>(endpoint: string, body?: Record<string, unknown>) => {
    try {
      // console.log("[LOG](request)", "post", API_HOST + endpoint, body);
      const resp = await client.post(endpoint, body);
      return Result.Ok<T>(resp.data);
    } catch (err) {
      const error = err as Error;
      return Result.Err(error.message);
    }
  },
};

/**
 * 创建短链接
 */
export async function create_link(url: string) {
  const base = "/yourls-api.php";
  const res = await request.get<{
    shorturl: string;
  }>(base, {
    username: app.env.SHORT_LINK_USERNAME,
    password: app.env.SHORT_LINK_PASSWORD,
    url,
    format: "json",
    action: "shorturl",
  });
  if (res.error) {
    return Result.Err(res.error.message);
  }
  return Result.Ok(res.data.shorturl);
}
