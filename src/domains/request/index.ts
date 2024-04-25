/**
 * @file API 请求
 */
// import axios, { CancelTokenSource } from "axios";

import { BaseDomain, Handler } from "@/domains/base";
import { BizError } from "@/domains/error/index";
import { HttpClientCore } from "@/domains/http_client/index";
import { Result, UnpackedResult } from "@/types/index";
import { sleep } from "@/utils/index";

import { RequestPayload, UnpackedRequestPayload } from "./utils";

enum Events {
  BeforeRequest,
  AfterRequest,
  LoadingChange,
  Success,
  Failed,
  Completed,
  Canceled,
  StateChange,
  ResponseChange,
}
type TheTypesOfEvents<T> = {
  [Events.LoadingChange]: boolean;
  [Events.BeforeRequest]: void;
  [Events.AfterRequest]: void;
  [Events.Success]: T;
  [Events.Failed]: BizError;
  [Events.Completed]: void;
  [Events.Canceled]: void;
  [Events.StateChange]: RequestState<T>;
  [Events.ResponseChange]: T | null;
};
type RequestState<T> = {
  loading: boolean;
  error: BizError | null;
  response: T | null;
};
type RequestProps = {
  client: HttpClientCore;
  delay?: null | number;
  defaultResponse?: RequestResponse<any>;
  fetch: (...args: any) => RequestPayload<any>;
  process?: (v: any) => Result<any>;
  onSuccess?: (v: RequestResponse<any>) => void;
  onFailed?: (error: BizError) => void;
  onCompleted?: () => void;
  onCanceled?: () => void;
  beforeRequest?: () => void;
  onLoading?: (loading: boolean) => void;
};

// type Arg = { fetch: (...args: any[]) => any; process?: (v: ReturnType<Arg["fetch"]>) => any };
type RequestResponse<
  A extends { fetch: (...args: any[]) => RequestPayload<any>; process?: (v: ReturnType<A["fetch"]>) => Result<any> }
> = A extends {
  fetch: (...args: any[]) => any;
  // v 的类型必须是 any，否则有问题
  process: (v: any) => any;
}
  ? UnpackedResult<ReturnType<A["process"]>>
  : UnpackedRequestPayload<ReturnType<A["fetch"]>>;

/**
 * 用于接口请求的核心类
 */
export class RequestCoreV2<T extends RequestProps> extends BaseDomain<TheTypesOfEvents<any>> {
  debug = false;

  defaultResponse: RequestResponse<T> | null = null;

  /** 原始 service 函数 */
  service: T["fetch"];
  process: T["process"];
  client: HttpClientCore;
  delay: null | number = 800;
  loading = false;
  /** 处于请求中的 promise */
  pending: Promise<RequestResponse<T>> | null = null;
  /** 调用 prepare 方法暂存的参数 */
  // args: Parameters<T> | null = null;
  /** 请求的响应 */
  response: RequestResponse<T> | null = null;
  /** 请求失败，保存错误信息 */
  error: BizError | null = null;
  id = String(this.uid());
  // source: CancelTokenSource;

  get state(): RequestState<RequestResponse<T>> {
    return {
      loading: this.loading,
      error: this.error,
      response: this.response,
    };
  }

  constructor(props: T) {
    super();

    const {
      client,
      delay,
      defaultResponse,
      fetch,
      process,
      onSuccess,
      onFailed,
      onCompleted,
      onCanceled,
      onLoading,
      beforeRequest,
    } = props;
    this.service = fetch;
    this.process = process;
    this.client = client;
    // this.method = method;
    if (delay !== undefined) {
      this.delay = delay;
    }
    if (defaultResponse) {
      this.defaultResponse = defaultResponse;
      this.response = defaultResponse;
    }
    // const source = axios.CancelToken.source();
    // this.source = source;
    if (onSuccess) {
      this.onSuccess(onSuccess);
    }
    if (onFailed) {
      this.onFailed(onFailed);
    }
    if (onCompleted) {
      this.onCompleted(onCompleted);
    }
    if (onCanceled) {
      this.onCanceled(onCanceled);
    }
    if (onLoading) {
      this.onLoadingChange(onLoading);
    }
    if (beforeRequest) {
      this.beforeRequest(beforeRequest);
    }
  }
  token?: unknown;
  /** 执行 service 函数 */
  async run(...args: Parameters<T["fetch"]>) {
    if (this.pending !== null) {
      const r = await this.pending;
      this.loading = false;
      const d = r.data as RequestResponse<T>;
      this.pending = null;
      return Result.Ok(d);
    }
    // this.args = args;
    this.loading = true;
    this.response = this.defaultResponse;
    this.error = null;
    // const source = axios.CancelToken.source();
    // this.source = source;
    this.emit(Events.LoadingChange, true);
    this.emit(Events.StateChange, { ...this.state });
    this.emit(Events.BeforeRequest);
    const r2 = (() => {
      const { url, method, query, body, headers } = this.service(...(args as unknown as any[]));
      if (method === "GET") {
        // const [query, extra = {}] = args;
        const r = this.client.get(url, query, {
          id: this.id,
          headers,
          // token: this.source.token,
          // ...extra,
        });
        // if (this.process) {
        //   return Result.Ok(this.process(r)) as Result<Promise<RequestResponse<T>>>;
        // }
        return Result.Ok(r) as Result<Promise<RequestResponse<T>>>;
      }
      if (method === "POST") {
        // const [body, extra = {}] = args;
        const r = this.client.post(url, body, {
          id: this.id,
          headers,
          // token: this.source.token,
          // ...extra,
        });
        // if (this.process) {
        //   return Result.Ok(this.process(r)) as Result<Promise<RequestResponse<T>>>;
        // }
        return Result.Ok(r) as Result<Promise<RequestResponse<T>>>;
      }
      return Result.Err(`未知的 method '${method}'`);
    })();
    if (r2.error) {
      return Result.Err(r2.error.message);
    }
    this.pending = r2.data;
    const [r] = await Promise.all([this.pending, this.delay === null ? null : sleep(this.delay)]);
    this.loading = false;
    const resp = this.process ? (this.process(r) as RequestResponse<T>) : r;
    this.emit(Events.LoadingChange, false);
    this.emit(Events.StateChange, { ...this.state });
    this.emit(Events.Completed);
    this.pending = null;
    if (resp.error) {
      if (resp.error.code === "CANCEL") {
        this.emit(Events.Canceled);
        return Result.Err(resp.error);
      }
      this.setError = resp.error;
      this.emit(Events.Failed, resp.error);
      this.emit(Events.StateChange, { ...this.state });
      return Result.Err(r.error);
    }
    this.response = resp.data;
    const d = resp.data as RequestResponse<T>;
    this.emit(Events.Success, d);
    this.emit(Events.StateChange, { ...this.state });
    this.emit(Events.ResponseChange, this.response);
    return Result.Ok(d);
  }
  /** 使用当前参数再请求一次 */
  reload() {
    // if (this.args === null) {
    //   return;
    // }
    // this.run(...this.args);
  }
  cancel() {
    this.client.cancel(this.id);
    // this.source.cancel("主动取消");
  }
  clear() {
    this.response = null;
    this.emit(Events.StateChange, { ...this.state });
    this.emit(Events.ResponseChange, this.response);
  }
  modifyResponse(fn: (resp: RequestResponse<T>) => RequestResponse<T>) {
    if (this.response === null) {
      return;
    }
    const nextResponse = fn(this.response);
    this.response = nextResponse;
    this.emit(Events.StateChange, { ...this.state });
    this.emit(Events.ResponseChange, this.response);
  }

  onLoadingChange(handler: Handler<TheTypesOfEvents<RequestResponse<T>>[Events.LoadingChange]>) {
    return this.on(Events.LoadingChange, handler);
  }
  beforeRequest(handler: Handler<TheTypesOfEvents<RequestResponse<T>>[Events.BeforeRequest]>) {
    return this.on(Events.BeforeRequest, handler);
  }
  onSuccess(handler: Handler<TheTypesOfEvents<RequestResponse<T>>[Events.Success]>) {
    return this.on(Events.Success, handler);
  }
  onFailed(handler: Handler<TheTypesOfEvents<RequestResponse<T>>[Events.Failed]>) {
    return this.on(Events.Failed, handler);
  }
  onCanceled(handler: Handler<TheTypesOfEvents<RequestResponse<T>>[Events.Canceled]>) {
    return this.on(Events.Canceled, handler);
  }
  /** 建议使用 onFailed */
  onError(handler: Handler<TheTypesOfEvents<RequestResponse<T>>[Events.Failed]>) {
    return this.on(Events.Failed, handler);
  }
  onCompleted(handler: Handler<TheTypesOfEvents<RequestResponse<T>>[Events.Completed]>) {
    return this.on(Events.Completed, handler);
  }
  onStateChange(handler: Handler<TheTypesOfEvents<RequestResponse<T>>[Events.StateChange]>) {
    return this.on(Events.StateChange, handler);
  }
  onResponseChange(handler: Handler<TheTypesOfEvents<RequestResponse<T>>[Events.ResponseChange]>) {
    return this.on(Events.ResponseChange, handler);
  }
}

// type FakeResult<A extends { fetch: (...args: any[]) => any; process?: (v: ReturnType<Arg["fetch"]>) => any }> =
//   A extends {
//     fetch: (...args: any[]) => any;
//     process: (v: ReturnType<Arg["fetch"]>) => any;
//   }
//     ? ReturnType<A["process"]>
//     : ReturnType<A["fetch"]>;
// type Arg = { fetch: (...args: any[]) => any; process?: (v: ReturnType<Arg["fetch"]>) => any };

// function run<A extends Arg>(arg: A): FakeResult<A> {
//   const { fetch, process } = arg;
//   const data = fetch();
//   return process ? process(data) : data;
// }

// // 使用示例
// const result1 = run({
//   fetch: () => {
//     return { name: "Alice" };
//   },
// });
// // 这里 TypeScript 应该能正确推断出 result1 的类型是 { name: string }

// function f() {
//   return { name: "Alice" };
// }
// const result2 = run({
//   fetch: f,
//   process(value: ReturnType<typeof f>) {
//     return { username: value.name.toLowerCase() };
//   },
// });

// // TypeScript 会正确推断出 result2 的类型是 { username: string }
// console.log(result2.username); // "alice"
