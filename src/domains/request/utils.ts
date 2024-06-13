/**
 * @file 构建 http 请求载荷
 */
import { RequestedResource } from "@/types/index";
import { Result } from "@/domains/result/index";
import { query_stringify } from "@/utils/index";

export type RequestPayload<T> = {
  hostname?: string;
  url: string;
  method: "POST" | "GET" | "DELETE" | "PUT";
  query?: any;
  params?: any;
  body?: any;
  headers?: Record<string, string | number>;
  // defaultResponse?: T;
  process?: (v: any) => T;
};
/**
 * GetRespTypeFromRequestPayload
 * T extends RequestPayload
 */
export type UnpackedRequestPayload<T> = NonNullable<T extends RequestPayload<infer U> ? (U extends null ? U : U) : T>;
// export type UnpackedRequestPayload<T> = T extends RequestPayload<infer U> ? U : T;
export type TmpRequestResp<T extends (...args: any[]) => any> = Result<UnpackedRequestPayload<RequestedResource<T>>>;

let posterHandler: null | ((v: RequestPayload<any>) => void) = null;
export function onCreatePostPayload(h: (v: RequestPayload<any>) => void) {
  posterHandler = h;
}
let getHandler: null | ((v: RequestPayload<any>) => void) = null;
export function onCreateGetPayload(h: (v: RequestPayload<any>) => void) {
  getHandler = h;
}

/**
 * 并不是真正发出网络请求，仅仅是「构建请求信息」然后交给 HttpClient 发出请求
 * 所以这里构建的请求信息，就要包含
 * 1. 请求地址
 * 2. 请求参数
 * 3. headers
 */
export const request = {
  get<T>(
    endpoint: string,
    query?: Record<string, string | number | boolean | null | undefined>,
    extra: Partial<{
      headers: Record<string, string | number>;
      // defaultResponse: T;
    }> = {}
  ) {
    // console.log("GET", endpoint);
    const { headers } = extra;
    const url = [endpoint, query ? "?" + query_stringify(query) : ""].join("");
    const resp = {
      url,
      method: "GET",
      // defaultResponse,
      headers,
    } as RequestPayload<T>;
    if (getHandler) {
      getHandler(resp);
    }
    return resp;
  },
  /** 构建请求参数 */
  post<T>(
    url: string,
    body?: Record<string, unknown> | FormData,
    extra: Partial<{
      headers: Record<string, string | number>;
      // defaultResponse: T;
    }> = {}
  ) {
    // console.log("POST", url);
    const { headers } = extra;
    const resp = {
      url,
      method: "POST",
      body,
      // defaultResponse,
      headers,
    } as RequestPayload<T>;
    if (posterHandler) {
      posterHandler(resp);
    }
    return resp;
  },
};

export function request_factory(opt: {
  hostnames: {
    dev?: string;
    test?: string;
    beta?: string;
    prod: string;
  };
  debug?: boolean;
  headers?: Record<string, string | number>;
  process?: (v: any) => any;
}) {
  let _hostname = opt.hostnames.prod;
  let _headers = (opt.headers ?? {}) as Record<string, string | number>;
  let _env = "prod";
  let _debug = opt.debug ?? false;
  return {
    setHostname(hostname: string) {
      if (_debug) {
        console.log("[REQUEST]utils - setHostname", hostname);
      }
      _hostname = hostname;
    },
    setHeaders(headers: Record<string, string | number>) {
      if (_debug) {
        console.log("[REQUEST]utils - setHeaders", headers);
      }
      _headers = headers;
    },
    appendHeaders(extra: Record<string, string | number>) {
      if (_debug) {
        console.log("[REQUEST]utils - appendHeaders", extra);
      }
      _headers = {
        ..._headers,
        ...extra,
      };
    },
    setEnv(env: keyof (typeof opt)["hostnames"]) {
      if (_debug) {
        console.log("[REQUEST]utils - setEnv", env);
      }
      const { prod, dev = prod, test = prod, beta = prod } = opt.hostnames;
      _env = env;
      if (env === "dev") {
        _hostname = dev;
      }
      if (env === "test") {
        _hostname = test;
      }
      if (env === "beta") {
        _hostname = beta;
      }
      if (env === "prod") {
        _hostname = prod;
      }
    },
    setDebug(debug: boolean) {
      _debug = debug;
    },
    get<T>(...args: Parameters<typeof request.get>) {
      const payload = request.get<T>(...args);
      const { url, method, query, params, body, headers } = payload;
      if (_debug) {
        console.log("create GET payload");
        console.log(payload);
        console.log("current hostname is", _hostname);
        console.log("current headers is", headers);
        console.log("current env is", _env);
      }
      const result: RequestPayload<T> = {
        hostname: _hostname,
        url,
        method,
        query,
        params,
        body,
        headers: {
          ...payload.headers,
          ..._headers,
        },
        process: opt.process,
      };
      return result;
    },
    post<T>(...args: Parameters<typeof request.post>) {
      const payload = request.post<T>(...args);
      const { url, method, query, params, body } = payload;
      if (_debug) {
        console.log("create POST payload");
        console.log(payload);
        console.log("current hostname is", _hostname);
        console.log("current headers is", _headers);
      }
      const result: RequestPayload<T> = {
        hostname: _hostname,
        url,
        method,
        query,
        params,
        body,
        headers: {
          ...payload.headers,
          ..._headers,
        },
        process: opt.process,
      };
      return result;
    },
  };
}
