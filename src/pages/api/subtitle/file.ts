/**
 * @file
 */
import axios from "axios";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { url } = req.body as Partial<{ url: string }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!url) {
    return e(Result.Err("缺少字幕链接"));
  }
  const user = t_res.data;
  //   const u = decodeURIComponent(url);
  try {
    const r = await axios.get(url, {
      headers: {
        referer: "https://www.aliyundrive.com/",
      },
    });
    res.status(200).json({ code: 0, msg: "", data: r.data });
    //     res.status(200).send(r.data);
  } catch (err) {
    return e(Result.Err("failed"));
  }
}
