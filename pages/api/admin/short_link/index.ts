/**
 * @file
 */
import axios from "axios";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { query_stringify } from "@/utils";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

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

export async function create_link(url: string) {
  const base = "/yourls-api.php";
  const res = await request.get<{
    shorturl: string;
  }>(base, {
    username: process.env.SHORT_LINK_USERNAME,
    password: process.env.SHORT_LINK_PASSWORD,
    url,
    format: "json",
    action: "shorturl",
  });
  if (res.error) {
    return Result.Err(res.error.message);
  }
  return Result.Ok(res.data.shorturl);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { url } = req.body as Partial<{ url: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!url) {
    return Result.Err("缺少链接");
  }
  const r = await create_link(url);
  if (r.error) {
    return e(r);
  }
  const shorturl = r.data;
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      url: shorturl,
    },
  });
}
