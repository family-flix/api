/**
 * @file 管理后台/同步云盘信息到数据库
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store } from "@/store/index";
import { User } from "@/domains/user/index";
import { Folder } from "@/domains/folder/index";
import { DiffTypes, FolderDiffer } from "@/domains/folder_differ/index";
import { DatabaseDriveClient } from "@/domains/clients/database/index";
import { is_video_file } from "@/utils/index";
import { Drive } from "@/domains/drive/index";
import { BaseApiResp, Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { FileType } from "@/constants/index";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  if (!id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const drive_res = await Drive.Get({ id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const { id: drive_id } = drive;
  const { root_folder_id, root_folder_name } = drive.profile;
  if (root_folder_id === null || root_folder_name === null) {
    return e(Result.Err("请先设置索引目录"));
  }
  const client = drive.client;
  const prev_folder = new Folder(root_folder_id, {
    name: root_folder_name,
    client: new DatabaseDriveClient({ drive_id, store }),
  });
  const folder = new Folder(root_folder_id, {
    name: root_folder_name,
    // @ts-ignore
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
    unique_key: "id",
  });
  await differ.run();
  const { effects } = differ;
  // log("应用 diff 的结果，共", effects.length, "个");
  // const { user_id, url, store } = options;
  for (let i = 0; i < effects.length; i += 1) {
    const effect = effects[i];
    const { type: effect_type, payload } = effect;
    const { id: file_id, name, type, parents } = payload;
    // log(`[${name}]`, "是", effect_type === DiffTypes.Deleting ? "删除" : "新增");
    if (effect_type === DiffTypes.Deleting) {
      // log(`[${name}]`, "删除文件", file_id);
      await store.prisma.file.deleteMany({ where: { file_id } });
      continue;
    }
    if (effect_type === DiffTypes.Adding) {
      if (type === "file" && !is_video_file(name)) {
        // log(`[${name}]`, "非视频文件，跳过");
        continue;
      }
      if (type === "folder") {
        // log(`[${name}]`, "新增文件夹");
        const r = await store.add_file({
          file_id,
          name,
          type: FileType.Folder,
          parent_file_id: parents[parents.length - 1].id,
          parent_paths: parents.map((p) => p.name).join("/"),
          drive_id,
        });
        if (r.error) {
          // log(`[${name}]`, "新增文件夹失败", r.error.message);
        }
        continue;
      }
      if (type === "file") {
        const r = await store.add_file({
          file_id,
          name,
          type: FileType.File,
          parent_file_id: parents[parents.length - 1].id,
          parent_paths: parents.map((p) => p.name).join("/"),
          drive_id,
        });
        if (r.error) {
          // log(`[${name}]`, "新增文件失败", r.error.message);
        }
      }
    }
  }
  // if (errors.length !== 0) {
  //   return Result.Err(errors.map((e) => e.message).join("\n"));
  // }
  // return Result.Ok(effects);

  res.status(200).json({
    code: 0,
    msg: "",
    data: differ.effects,
  });
}
