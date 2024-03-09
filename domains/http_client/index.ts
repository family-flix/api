/**
 * @file 请求库的壳，可以拓展它来生成多个 client
 * 该设计可以让 client 适用于不同的业务（返回值 code 逻辑不同）、不同端（实现不同 provider 即可如 provider.weapp.ts）
 * 对外暴露的接口统一，从而实现多个端、业务使用体验保持一致
 * hostname 不同，建议另外起一个 handleURL 方法来处理，传给 get、post 方法的应该是带 hostname 的 url
 */
import { BaseDomain, Handler } from "@/domains/base";
import { JSONObject, Result } from "@/types";
import { query_stringify } from "@/utils";

enum Events {
  StateChange,
}
type TheTypesOfEvents = {
  [Events.StateChange]: HttpClientCoreState;
};
type HttpClientCoreState = {};
type HttpClientCoreProps = {
  hostname: string;
  headers?: Record<string, string>;
};
export class HttpClientCore extends BaseDomain<TheTypesOfEvents> {
  hostname: string;
  headers: Record<string, string> = {};

  constructor(props: Partial<{ _name: string }> & HttpClientCoreProps) {
    super(props);

    const { hostname, headers = {} } = props;

    this.hostname = hostname;
    this.headers = headers;
  }

  async get<T>(
    endpoint: string,
    query: Record<string, string | number | boolean | undefined | null>,
    extra: Partial<{ headers: Record<string, string>; token: unknown }> = {}
  ): Promise<Result<T>> {
    try {
      const h = this.hostname;
      const url = `${h}${endpoint}${Object.keys(query).length ? "?" + query_stringify(query) : ""}`;
      const headers = {
        ...this.headers,
        ...(extra.headers || {}),
      };
      const resp = await this.fetch<{ code: number | string; msg: string; data: unknown | null }>({
        url,
        method: "GET",
        headers,
      });
      return Result.Ok(resp as T);
    } catch (err) {
      const error = err as Error;
      const { message } = error;
      return Result.Err(message);
    }
  }
  async post<T>(
    endpoint: string,
    body?: JSONObject | FormData,
    extra: Partial<{ headers: Record<string, string>; token: unknown }> = {}
  ): Promise<Result<T>> {
    const h = this.hostname;
    const url = `${h}${endpoint}`;
    try {
      const headers = {
        ...this.headers,
        ...(extra.headers || {}),
      };
      const resp = await this.fetch<{ code: number | string; msg: string; data: unknown | null }>({
        url,
        method: "POST",
        data: body,
        headers,
      });
      return Result.Ok(resp as T);
    } catch (err) {
      const error = err as Error;
      const { message } = error;
      return Result.Err(message);
    }
  }
  async fetch<T>(options: {
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    data?: JSONObject | FormData;
    headers?: Record<string, string>;
  }) {
    console.warn("请调用 provider connect 方法覆盖该 fetch 方法。具体见 provider.axios.ts 文件");
    return {} as { data: T };
  }
  /** 取消请求 */
  cancel() {}
  /** 覆盖 headers */
  setHeaders(headers: Record<string, string>) {
    this.headers = headers;
  }
  /** 追加 headers */
  appendHeaders(headers: Record<string, string>) {
    this.headers = {
      ...this.headers,
      ...headers,
    };
  }

  onStateChange(handler: Handler<TheTypesOfEvents[Events.StateChange]>) {
    return this.on(Events.StateChange, handler);
  }
}
