/**
 * @file
 */
import vm from "vm";

import dayjs from "dayjs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { Member } from "@/domains/user/member";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { BaseApiResp, Result } from "@/types";
import { MediaProfileSourceTypes, MediaTypes, CollectionTypes } from "@/constants";
import { response_error_factory } from "@/utils/server";
import { store, app } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { code } = req.body as Partial<{ code: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!code) {
    return e(Result.Err("缺少代码"));
  }
  const user = t_res.data;
  try {
    const result: unknown[] = [];
    const context = {
      console: {
        log: (...args: unknown[]) => {
          result.push([...args]);
        },
      },
      User,
      Drive,
      Member,
      dayjs,
      walk_model_with_cursor,
      CollectionTypes,
      MediaProfileSourceTypes,
      MediaTypes,
      store,
      app,
    };
    const sandbox = vm.createContext(context);
    await vm.runInNewContext(
      `(async () => {
${code}
})()`,
      sandbox
    );
    res.status(200).json({ code: 0, msg: "", data: result });
    return;
  } catch (error) {
    const err = error as Error;
    return e(Result.Err(err.message));
  }
}
