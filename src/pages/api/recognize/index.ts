/**
 * @file 识别一段话
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { SpeechToText } from "@/domains/speech";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { data } = req.body as { data: string };

  const { VOICE_RECOGNIZE_SECRET_ID: secret_id, VOICE_RECOGNIZE_SECRET_KEY: secret_key } = app.env;
  if (!secret_id || !secret_key) {
    return Result.Err("缺少 secret_id");
  }
  const client = new SpeechToText({
    secret_id,
    secret_key,
  });
  const r2 = await client.run(data);
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      text: r2.data,
    },
  });
}
