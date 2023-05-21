/**
 * @file 增量索引云盘（仅索引通过「转存」操作转存到云盘的文件，速度更快）
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { walk_drive } from "@/domains/walker/analysis_aliyun_drive";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { User } from "@/domains/user";
import { store } from "@/store";
import { response_error_factory } from "@/utils/backend";
import { BaseApiResp, Result } from "@/types";
import { FileType } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id } = req.query as Partial<{
    id: string;
  }>;
  if (!drive_id) {
    return e("缺少云盘 id 参数");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const drive_res = await store.find_drive({ id: drive_id });
  if (drive_res.error) {
    return e(drive_res);
  }
  if (!drive_res.data) {
    return e("没有找到匹配的云盘记录");
  }
  const { root_folder_id, root_folder_name } = drive_res.data;
  if (!root_folder_name) {
    return e("请先设置索引根目录");
  }
  const tmp_folders = await store.prisma.tmp_file.findMany({
    where: {
      type: FileType.Folder,
      drive_id,
      user_id,
    },
  });
  if (tmp_folders.length === 0) {
    return Result.Err("没有找到可索引的转存文件");
  }
  const client = new AliyunDriveClient({
    drive_id,
    store,
  });
  const r = await walk_drive({
    drive_id,
    user_id,
    client,
    files: tmp_folders.map((folder) => {
      const { name } = folder;
      return {
        name: `${root_folder_name}/${name}`,
        type: "folder",
      };
    }),
    store,
    need_upload_image: true,
  });
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: r.data });
}
