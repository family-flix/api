import os from "os";

import { decode_token } from "@/domains/user/jwt";
import { BaseApiResp } from "@/store/index";
import { Result, resultify } from "@/types/index";

/**
 * 解析 token
 */
export async function parse_token({ token, secret }: { token?: string; secret: string }) {
  if (!token) {
    return Result.Err("Missing auth token");
  }
  const user_res = await resultify(decode_token)({ token, secret });
  if (user_res.error) {
    return Result.Err(user_res.error);
  }
  const user = user_res.data;
  if (user === null) {
    return Result.Err("invalid token");
  }
  if (user.id) {
    return Result.Ok({
      id: user.id,
    });
  }
  return Result.Err("invalid token");
}

/**
 * 生成 token
 * @param payload
 * @returns
 */
// export function generate_token(payload: Record<string, number | string>) {
//   const secret = "test";
//   const token = jwt.sign(payload, secret);
//   return Result.Ok(token);
// }

type NextApiResponse = {};
const DEFAULT_CODE = 10000;
export function response_error_factory(res: NextApiResponse) {
  return (result: Result<unknown> | string | Error) => {
    // @ts-ignore
    return res.status(200).json(
      (() => {
        if (typeof result === "string") {
          return {
            code: DEFAULT_CODE,
            msg: result,
            data: null,
          };
        }
        if (result instanceof Error) {
          return {
            code: DEFAULT_CODE,
            msg: result.message,
            data: null,
          };
        }
        return {
          code: result.code || DEFAULT_CODE,
          msg: result.error === null ? "Unknown error?" : result.error.message,
          data: result.data,
        };
      })()
    );
  };
}
export async function compat_next<
  T extends {
    req: {
      method: string;
      header(name?: string): Record<string, string>;
      query(name?: string): Record<string, string>;
      json(): Promise<unknown>;
      parseBody(arg: { all: boolean }): Promise<unknown>;
    };
    json(data: any): void;
  }
>(
  c: T
): Promise<
  [
    { headers: Record<string, string>; query: Record<string, string>; body: any },
    {
      status(code: number): {
        json(data: any): BaseApiResp<unknown>;
      };
    }
  ]
> {
  const headers = await c.req.header();
  const query = await c.req.query();
  const body = await (async () => {
    if (c.req.method !== "POST") {
      return {};
    }
    if (headers["content-type"] && headers["content-type"].includes("multipart/form-data")) {
      return c.req.parseBody({ all: true });
    }
    return c.req.json();
  })();
  return [
    {
      headers,
      query,
      body,
    },
    {
      // @ts-ignore
      status(code: number) {
        return {
          json(data: any) {
            return c.json(data);
          },
        };
      },
    },
  ];
}
export function simple_resp<T>(c: T) {
  return {
    s: (result: Result<unknown>) => {
      // @ts-ignore
      return c.json({ code: 0, msg: "", data: result.data });
    },
    e: (result: Result<unknown> | string | Error) => {
      const data = (() => {
        if (typeof result === "string") {
          return {
            code: DEFAULT_CODE,
            msg: result,
            data: null,
          };
        }
        if (result instanceof Error) {
          return {
            code: DEFAULT_CODE,
            msg: result.message,
            data: null,
          };
        }
        return {
          code: result.code || DEFAULT_CODE,
          msg: result.error === null ? "Unknown error?" : result.error.message,
          data: result.data,
        };
      })();
      // @ts-ignore
      return c.json(data);
    },
  };
}

/**
 * 解析命令行参数
 * @example
 * const args = process.argv.slice(2);
 * const options = parse_argv(args);
 */
export function parse_argv<T extends Record<string, any>>(args: string[]) {
  // @ts-ignore
  const options: T = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (key.startsWith("-")) {
      const k = key.replace(/^-{1,}/, "");
      const v = (() => {
        if (value === undefined) {
          return true;
        }
        if (value.toLowerCase() === "true") {
          return true;
        }
        if (value.toLowerCase() === "false") {
          return false;
        }
        return value;
      })();
      // @ts-ignore
      options[k] = v;
    }
  }
  return options;
}

export function get_ip_address() {
  const interfaces = os.networkInterfaces();
  for (const interface_name in interfaces) {
    const networkInterface = interfaces[interface_name];
    if (networkInterface) {
      for (const network of networkInterface) {
        // 过滤掉 IPv6 地址和回环地址
        if (network.family === "IPv4" && !network.internal) {
          return network.address;
        }
      }
    }
  }
  return "0.0.0.0";
}
