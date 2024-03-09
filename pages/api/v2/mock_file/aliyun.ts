/**
 * @file 使用阿里云分享资源，构建一个文件树
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store } from "@/store/index";
import { User } from "@/domains/user/index";
import { Folder } from "@/domains/folder/index";
import { DriveTypes } from "@/domains/drive/constants";
import { AliyunShareResourceClient } from "@/domains/clients/aliyun_resource";
import { BaseApiResp, Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    url,
    code,
    parent_file_id = "root",
  } = req.query as Partial<{
    url: string;
    code: string;
    parent_file_id: string;
    next_marker: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!url) {
    return e(Result.Err("缺少资源链接"));
  }
  const id_r = url.match(/\/s\/([0-9a-zA-Z]{11})/);
  if (!id_r) {
    return e(Result.Err("不是合法的资源链接"));
  }
  const share_id = id_r[1];
  const drive = await store.prisma.drive.findFirst({ where: { type: DriveTypes.AliyunBackupDrive, user_id: user.id } });
  if (!drive) {
    return Result.Err("请先添加一个云盘", 10002);
  }
  const r = await AliyunShareResourceClient.Get({ id: drive.id, url, code, user, store });
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const client = r.data.client;
  const folder = new Folder(parent_file_id, {
    client,
  });
  type File = {
    file_id: string;
    parent_file_id: string;
    name: string;
    type: string;
    items: File[];
  };
  const data: File = {
    file_id: folder.id,
    parent_file_id: "root",
    name: folder.name,
    type: folder.type,
    items: [],
  };
  let cur_file: File = data;
  await folder.walk(async (file) => {
    const { id, name, parent_file_id, type } = file;
    if (cur_file && parent_file_id === cur_file.file_id) {
      cur_file.items.push({
        file_id: id,
        parent_file_id,
        name,
        type,
        items: [],
      });
    }
    return true;
  });
  res.status(200).json({ code: 0, msg: "", data });
}
