/**
 * @file 递归地获取指定文件夹所有子文件&子文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store } from "@/store";
import { Folder } from "@/domains/folder";
import { AliyunShareResourceClient } from "@/domains/clients/aliyun_resource";
import { DriveTypes } from "@/domains/drive/constants";
import { User } from "@/domains/user";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";

type SimpleAliyunDriveFile = {
  file_id: string;
  name: string;
  type?: string;
  parent_file_id: string;
  items?: SimpleAliyunDriveFile[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<unknown>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    file_id = "root",
    name = "root",
    url,
    code,
  } = req.body as Partial<{
    file_id: string;
    name: string;
    url: string;
    code: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!file_id) {
    return e(Result.Err("缺少文件夹 id 参数"));
  }
  if (!url) {
    return e(Result.Err("缺少资源链接"));
  }
  const id_r = AliyunShareResourceClient.GetShareId(url);
  if (!id_r) {
    return e(Result.Err("不是合法的资源链接"));
  }
  const drive = await store.prisma.drive.findFirst({
    where: {
      OR: [
        {
          type: DriveTypes.AliyunBackupDrive,
        },
        {
          type: DriveTypes.AlipanOpenDrive,
        },
      ],
      user_id: user.id,
    },
  });
  if (!drive) {
    return e(Result.Err("请先添加一个云盘", 10002));
  }
  // const r = await Drive.Get({ id: drive.id, user, store });
  // if (r.error) {
  //   return e(Result.Err(r.error.message));
  // }
  // const client = r.data.client;
  // if (!(client instanceof AliyunDriveClient)) {
  //   return e(Result.Err("该操作仅支持阿里云盘"));
  // }
  const tree: SimpleAliyunDriveFile = {
    file_id,
    name,
    type: "folder",
    parent_file_id: "root",
    items: [],
  };
  const r = await AliyunShareResourceClient.Get({ id: drive.id, url, code, user, store });
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const client = r.data;
  const folder = new Folder(file_id, {
    name,
    client,
  });
  async function walk_folder(f: Folder, parent: SimpleAliyunDriveFile) {
    let times = 0;
    do {
      const r = await f.next();
      if (r.error) {
        times += 1;
        if (times >= 3) {
          return;
        }
        continue;
      }
      times = 0;
      for (let i = 0; i < r.data.length; i += 1) {
        const file = r.data[i];
        const { id: file_id, name, parent_file_id, type } = file;
        const ff = {
          file_id,
          name,
          type,
          parent_file_id: parent_file_id!,
        } as SimpleAliyunDriveFile;
        if (file instanceof Folder) {
          if (parent.items) {
            ff.items = [];
            parent.items.push(ff);
          }
          await walk_folder(file, ff);
          continue;
        }
        if (parent.items) {
          parent.items.push(ff);
        }
      }
    } while (f.next_marker);
  }
  await walk_folder(folder, tree);
  return res.status(200).json(tree);
}
