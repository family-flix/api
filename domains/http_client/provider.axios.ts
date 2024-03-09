/**
 * @file 具体的请求方法实现
 * @example
 * ```js
 * const client = new HttpClientCore({
 *   hostname: 'https://api.example.com',
 * });
 * connect(client);
 *
 * client.get('/api/ping');
 * ```
 */
import axios, { AxiosError } from "axios";

import { Result } from "@/types/index";

import { HttpClientCore } from "./index";

export function connect(store: HttpClientCore) {
  store.fetch = async (options) => {
    const { url, method, data, headers } = options;
    if (method === "GET") {
      try {
        const response = await axios.get(url, {
          headers: {
            ...headers,
          },
        });
        const profile = {
          status: response.status,
          data: response.data,
        };
        return Result.Ok(response.data, 200, profile);
      } catch (err) {
        const error = err as AxiosError<{ code: string; message: string }>;
        const { response, message } = error;
        const profile = {
          status: response?.status,
          data: response?.data,
        };
        return Result.Err(response?.data?.message || message, response?.data?.code, profile);
      }
    }
    if (method === "POST") {
      try {
        const response = await axios.post(url, data, {
          headers: {
            ...headers,
          },
        });
        const profile = {
          status: response.status,
          data: response.data,
        };
        return Result.Ok(response.data, 200, profile);
      } catch (err) {
        const error = err as AxiosError<{ code: string; message: string }>;
        const { response, message } = error;
        const profile = {
          status: response?.status,
          data: response?.data,
        };
        return Result.Err(response?.data?.message || message, response?.data?.code, profile);
      }
    }
    return Promise.reject("unknown method");
  };
}
