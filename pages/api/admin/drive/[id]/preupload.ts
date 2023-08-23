/**
 * @file 获取上传地址
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { Drive } from "@/domains/drive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const body = req.body as {
    content_hash: string;
    content_hash_name: "sha1";
    name: string;
    parent_file_id: string;
    part_info_list: { part_number: number }[];
    proof_code: string;
    size: number;
    type: "file";
  };
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const drive_res = await Drive.Get({
    id: "O2wsuqkBwNehfXe",
    user_id: user.id,
    store,
  });
  if (drive_res.error) {
    return e(drive_res);
  }
  const client = drive_res.data.client;
  const r = await client.create_with_folder(body);
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: r.data });
}
