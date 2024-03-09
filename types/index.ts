import { BizError } from "@/domains/error";

export type Resp<T> = {
  data: T extends null ? null : T;
  code?: number | string;
  error: T extends null ? BizError : null;
  profile?: unknown;
};
export type Result<T> = Resp<T> | Resp<null>;
export type UnpackedResult<T> = NonNullable<T extends Resp<infer U> ? (U extends null ? U : U) : T>;
/** 构造一个结果对象 */
export const Result = {
  /** 构造成功结果 */
  Ok: <T>(value: T, code?: number | string, profile: unknown = null) => {
    const result = {
      data: value,
      code,
      error: null,
      profile,
    } as Result<T>;
    return result;
  },
  /** 构造失败结果 */
  Err: <T>(message: string | Error | Result<null>, code?: number | string, profile: unknown = null) => {
    const result = {
      data: null,
      code,
      error: (() => {
        if (!message) {
          return new BizError("未知错误");
        }
        if (typeof message === "string") {
          return new BizError(message, code);
        }
        if (message instanceof Error) {
          return new BizError(message.message, code);
        }
        const r = message as Result<null>;
        if (code) {
          r.error.code = code;
        }
        return r.error;
      })(),
      profile,
    } as Result<null>;
    return result;
  },
};
export type MutableRecord<U> = {
  [SubType in keyof U]: {
    type: SubType;
    data: U[SubType];
  };
}[keyof U];
export type MutableRecordV2<U> = {
  [SubType in keyof U]: {
    type: SubType;
  } & U[SubType];
}[keyof U];
/** 将一个返回 promise 的函数转换成返回 Result 的函数 */
export function resultify<F extends (...args: any[]) => Promise<any>>(fn: F) {
  return async (...args: Parameters<F>) => {
    try {
      const data = await fn(...args);
      const r = Result.Ok(data) as Result<Unpacked<ReturnType<F>>>;
      return r;
    } catch (err) {
      const e = err as Error;
      return Result.Err(e.message);
    }
  };
}

export type Unpacked<T> = T extends (infer U)[]
  ? U
  : T extends (...args: any[]) => infer U
  ? U
  : T extends Promise<infer U>
  ? U
  : T extends Result<infer U>
  ? U
  : T;

export type BaseApiResp<T> = {
  code: number;
  msg: string;
  data: T;
};

export type ListResponse<T> = {
  total: number;
  page: number;
  page_size: number;
  list: T[];
};

export type RequestedResource<T extends (...args: any[]) => any> = UnpackedResult<Unpacked<ReturnType<T>>>;

export interface JSONArray extends Array<JSONValue> {}
export type JSONValue = string | number | boolean | JSONObject | JSONArray | null;
export type JSONObject = { [Key in string]?: JSONValue };
