/**
 * @file 移动图片文件到相册
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { AliyunBackupDriveClient } from "@/domains/aliyundrive";
import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { drive_id, album_id } = req.query as Partial<{ drive_id: string; album_id: string }>;
  const { file_id } = req.body as Partial<{ file_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  if (!album_id) {
    return e(Result.Err("缺少相册 id"));
  }
  if (!file_id) {
    return e(Result.Err("缺少要转存的文件 id"));
  }
  const client_res = await AliyunBackupDriveClient.Get({ drive_id, store });
  if (client_res.error) {
    return e(client_res);
  }
  const client = client_res.data;
  const data_res = await client.save_files_to_album({ file_id, drive_id, album_id });
  if (data_res.error) {
    return e(data_res);
  }
  const data = data_res.data;
  res.status(200).json({
    code: 0,
    msg: "转存成功",
    data: data.file_list.map((file) => {
      const { file_id, name, size } = file;
      return {
        file_id,
        name,
        size,
      };
    }),
  });
}
