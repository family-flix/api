/**
 * @file 获取本地指定路径下的文件夹/文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { LocalFileClient } from "@/domains/local";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id = "root" } = req.query as Partial<{ file_id: string }>;

  const client = new LocalFileClient();
  const files = await client.fetch_files(file_id);

  res.status(200).json({ code: 0, msg: "", data: files });
}
