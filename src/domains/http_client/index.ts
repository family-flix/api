import { BaseDomain, Handler } from "@/domains/base";
import { Result } from "@/domains/result/index";
import { JSONObject } from "@/types/index";
import { query_stringify } from "@/utils/index";

enum Events {
  StateChange,
}
type TheTypesOfEvents = {
  [Events.StateChange]: void;
};

type HttpClientCoreProps = {
  hostname?: string;
  headers?: Record<string, string>;
  debug?: boolean;
};
type HttpClientCoreState = {};

export class HttpClientCore extends BaseDomain<TheTypesOfEvents> {
  hostname: string = "";
  headers: Record<string, string> = {};
  debug = false;

  constructor(props: HttpClientCoreProps = {}) {
    super(props);

    const { hostname = "", headers = {}, debug = false } = props;

    this.hostname = hostname;
    this.headers = headers;
    this.debug = debug;
  }

  async get<T>(
    endpoint: string,
    query?: Record<string, string | number | undefined>,
    extra: Partial<{ headers: Record<string, string | number>; id: string }> = {}
  ): Promise<Result<T>> {
    try {
      const h = this.hostname;
      const url = [h, endpoint, query ? "?" + query_stringify(query) : ""].join("");
      const payload = {
        url,
        method: "GET" as const,
        id: extra.id,
        headers: {
          ...this.headers,
          ...(extra.headers || {}),
        },
      };
      if (this.debug) {
        console.log("[DOMAIN]http_client - before fetch", payload);
      }
      const resp = await this.fetch<T>(payload);
      return Result.Ok(resp.data);
    } catch (err) {
      const error = err as Error;
      const { message } = error;
      return Result.Err(message);
    }
  }
  async post<T>(
    endpoint: string,
    body?: JSONObject | FormData,
    extra: Partial<{ headers: Record<string, string | number>; id: string }> = {}
  ): Promise<Result<T>> {
    const h = this.hostname;
    const url = [h, endpoint].join("");
    try {
      const payload = {
        url,
        method: "POST" as const,
        data: body,
        id: extra.id,
        headers: {
          ...this.headers,
          ...(extra.headers || {}),
        },
      };
      if (this.debug) {
        console.log("[DOMAIN]http_client - before fetch", payload);
      }
      const resp = await this.fetch<T>(payload);
      return Result.Ok(resp.data);
    } catch (err) {
      const error = err as Error;
      const { message } = error;
      return Result.Err(message);
    }
  }
  async fetch<T>(options: {
    url: string;
    method: "GET" | "POST";
    id?: string;
    data?: JSONObject | FormData;
    headers?: Record<string, string | number>;
  }) {
    console.log("请在 connect 中实现 fetch 方法");
    return { data: {} } as { data: T };
  }
  cancel(id: string) {
    const tip = "请在 connect 中实现 cancel 方法";
    console.log(tip);
    return Result.Err(tip);
  }
  setHeaders(headers: Record<string, string>) {
    this.headers = headers;
  }
  appendHeaders(headers: Record<string, string>) {
    this.headers = {
      ...this.headers,
      ...headers,
    };
  }
  setDebug(debug: boolean) {
    this.debug = debug;
  }

  onStateChange(handler: Handler<TheTypesOfEvents[Events.StateChange]>) {
    return this.on(Events.StateChange, handler);
  }
}
