/**
 * @file 客户端请求库
 */
import axios, { AxiosError } from "axios";

import { Result } from "@/types";
import { user } from "@/domains/user";

import { query_stringify } from ".";
import dayjs from "dayjs";

const client = axios.create({
  timeout: 6000,
});
type RequestClient = {
  get: <T>(
    url: string,
    query?: Record<string, string | number | undefined>
  ) => Promise<Result<T>>;
  post: <T>(url: string, body: Record<string, unknown>) => Promise<Result<T>>;
};
export const request = {
  get: async (endpoint, query) => {
    try {
      const url = `${endpoint}${query ? "?" + query_stringify(query) : ""}`;
      const resp = await client.get(url, {
        headers: {
          Authorization: user.token,
        },
      });
      const { code, msg, data } = resp.data;
      if (code !== 0) {
        return Result.Err(msg);
      }
      return Result.Ok(data);
    } catch (err) {
      const { response, message } = err as AxiosError;
      return Result.Err(message);
    }
  },
  post: async (url, body) => {
    try {
      const resp = await client.post(url, body, {
        headers: {
          Authorization: user.token,
        },
      });
      const { code, msg, data } = resp.data;
      if (code !== 0) {
        return Result.Err(msg);
      }
      return Result.Ok(data);
    } catch (err) {
      const error = err as AxiosError;
      const { response, message } = error;
      return Result.Err(message);
    }
  },
} as RequestClient;
