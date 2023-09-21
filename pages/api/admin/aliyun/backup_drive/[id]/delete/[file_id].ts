/**
 * @file 阿里云盘 删除指定文件列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { file_id, include_drive = "0" } = req.query as Partial<{
    file_id: string;
    include_drive: "0" | "1";
  }>;
  if (!file_id) {
    return e("缺少文件 id");
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const file_res = await store.find_file({
    file_id,
  });
  if (file_res.error) {
    return e(file_res);
  }
  const file = file_res.data;
  if (file && include_drive === "1") {
    const { drive_id } = file;
    const drive_res = await Drive.Get({ id: drive_id, user, store });
    if (drive_res.error) {
      return e(drive_res);
    }
    const drive = drive_res.data;
    const r = await drive.client.to_trash(file_id);
    if (r.error) {
      return e(r);
    }
  }
  await (async () => {
    await store.delete_file({
      file_id,
    });
  })();
  await store.delete_parsed_episode({
    file_id,
  });
  await store.delete_parsed_movie({
    file_id,
  });
  res.status(200).json({ code: 0, msg: "删除文件成功", data: null });
}
