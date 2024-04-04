import axios, { CancelTokenSource } from "axios";

import { Result } from "@/types/index";

import { HttpClientCore } from "./index";

export function connect(store: HttpClientCore) {
  let requests: { id: string; source: CancelTokenSource }[] = [];
  store.fetch = async (options) => {
    const { url, method, id = String(store.uid()), data, headers } = options;
    const source = axios.CancelToken.source();
    requests.push({
      id,
      source,
    });
    if (method === "GET") {
      try {
        const r = await axios.get(url, {
          params: data,
          headers,
          cancelToken: source.token,
        });
        requests = requests.filter((r) => r.id !== id);
        return r;
      } catch (err) {
        requests = requests.filter((r) => r.id !== id);
        throw err;
      }
    }
    if (method === "POST") {
      try {
        const r = await axios.post(url, data, {
          headers,
          cancelToken: source.token,
        });
        requests = requests.filter((r) => r.id !== id);
        return r;
      } catch (err) {
        requests = requests.filter((r) => r.id !== id);
        throw err;
      }
    }
    return Promise.reject("unknown method");
  };
  store.cancel = (id: string) => {
    const matched = requests.find((r) => r.id === id);
    if (!matched) {
      return Result.Err("没有找到对应请求");
    }
    requests = requests.filter((r) => r.id !== id);
    matched.source.cancel("主动取消");
    return Result.Ok(null);
  };
}
