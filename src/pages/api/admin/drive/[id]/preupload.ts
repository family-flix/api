/**
 * @file 获取上传地址
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { Drive } from "@/domains/drive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const body = req.body as Partial<{
    content_hash: string;
    content_hash_name: "sha1";
    name: string;
    parent_file_id: string;
    part_info_list: { part_number: number }[];
    proof_code: string;
    size: number;
    type: "file";
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { name, size, part_info_list, parent_file_id, content_hash, content_hash_name, proof_code, type } = body;
  if (!name) {
    return e("缺少 name");
  }
  if (!size) {
    return e("缺少 size");
  }
  if (!part_info_list) {
    return e("缺少 part_info_list");
  }
  if (!parent_file_id) {
    return e("缺少 parent_file_id");
  }
  const drive_res = await Drive.Get({
    id: "O2wsuqkBwNehfXe",
    user,
    store,
  });
  if (drive_res.error) {
    return e(drive_res);
  }
  const client = drive_res.data.client;
  const r = await client.create_with_folder({
    name,
    size,
    part_info_list,
    parent_file_id,
    content_hash,
    content_hash_name,
    proof_code,
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: r.data });
}
