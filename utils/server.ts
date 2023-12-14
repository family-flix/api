import { NextApiResponse } from "next";

import { decode_token } from "@/domains/user/jwt";
import { Result, resultify } from "@/types";

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

const DEFAULT_CODE = 10000;
export function response_error_factory(res: NextApiResponse) {
  return (result: Result<unknown> | string | Error) => {
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

export function parse_argv(args: string[]) {
  const options: Record<string, string | boolean> = {};
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
      options[k] = v;
    }
  }
  return options;
}
