/**
 * @file 递归地获取指定文件夹所有子文件&子文件夹
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import fs from "fs";
import path from "path";

import type { NextApiRequest, NextApiResponse } from "next";

import { Folder } from "@/domains/folder";
import { AliyunDriveClient } from "@/domains/clients/alipan";
import { Drive } from "@/domains/drive";
import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

type SimpleAliyunDriveFile = {
  file_id: string;
  name: string;
  type?: string;
  parent_file_id: string;
  items?: SimpleAliyunDriveFile[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { query } = req;
  const {
    file_id,
    drive_id,
    name = "folder_name",
  } = query as Partial<{
    file_id: string;
    drive_id: string;
    name: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!file_id) {
    return e(Result.Err("缺少文件夹 id 参数"));
  }
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id 参数"));
  }
  const tree: SimpleAliyunDriveFile = {
    file_id,
    name,
    type: "folder",
    parent_file_id: "tv",
    items: [],
  };
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const client = drive.client;
  const folder = new Folder(file_id, {
    name: "tv",
    client,
  });
  async function walk_folder(f: Folder, parent: SimpleAliyunDriveFile) {
    do {
      const r = await f.next();
      if (r.error) {
        continue;
      }
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
  if (process.env.MOCK_PATH) {
    // 方便生成用于单测的 mock 数据
    fs.writeFile(
      path.resolve(process.env.MOCK_PATH, `${file_id}.ts`),
      [
        "export const id = 'tv';",
        "export const data = {",
        "  file_id: id,",
        "  name: 'tv',",
        "  parent_file_id: 'root',",
        "  type: 'folder',",
        "  items: [",
      ]
        .concat(JSON.stringify(tree, null, 2).split("\n"))
        .concat(["],", "};"])
        .join("\n"),
      (e) => {
        // ...
      }
    );
  }
  res.status(200).json({ code: 0, msg: "", data: tree });
}
