/**
 * @file 管理后台/同步云盘信息到数据库
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { folder_client, store } from "@/store";
import { User } from "@/domains/user";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { AliyunDriveFolder } from "@/domains/aliyundrive/folder";
import { FolderDiffer } from "@/domains/folder_differ";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少云盘 id");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const drive = await store.prisma.drive.findFirst({
    where: {
      id,
      user_id,
    },
  });
  if (drive === null) {
    return e("没有匹配的云盘记录");
  }

  const { id: drive_id, root_folder_id, root_folder_name } = drive;
  if (root_folder_id === null || root_folder_name === null) {
    return e("请先设置索引目录");
  }

  const client = new AliyunDriveClient({ drive_id, store });
  const prev_folder = new AliyunDriveFolder(root_folder_id, {
    name: root_folder_name,
    client: folder_client({ drive_id }, store),
  });
  const folder = new AliyunDriveFolder(root_folder_id, {
    name: root_folder_name,
    client: {
      fetch_files: async (file_id: string, options: Partial<{ marker: string; page_size: number }> = {}) => {
        const r = await client.fetch_files(file_id, {
          ...options,
        });
        if (r.error) {
          return r;
        }
        return r;
      },
    },
  });
  const differ = new FolderDiffer({
    folder,
    prev_folder,
    unique_key: "name",
  });
  await differ.run();

  res.status(200).json({
    code: 0,
    msg: "",
    data: differ.effects,
  });
}
