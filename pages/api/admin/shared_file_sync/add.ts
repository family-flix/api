/**
 * @file 建立同步任务（将分享文件夹和云盘内文件夹关联）
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { build_link_between_shared_files_with_folder } from "@/domains/walker/utils";
import { store } from "@/store";
import { User } from "@/domains/user";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { url, file_id, file_name, target_file_id } = req.body as Partial<{
    url: string;
    /** 分享文件夹 id */
    file_id: string;
    /** 分享文件夹名称(同时也会用这个名字去网盘中找同名的) */
    file_name: string;
    /** 云盘文件夹 file_id。如果指定了该参数，就不会使用 file_name 去网盘中找同名，直接使用该参数 */
    target_file_id: string;
  }>;
  if (!file_id) {
    return e("缺少分享文件夹 id 参数");
  }
  if (!file_name) {
    return e("缺少分享文件夹名称参数");
  }
  if (!url) {
    return e("缺少分享链接参数");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const r1 = await store.find_shared_file_save({
    url,
    file_id,
    name: file_name,
    user_id,
  });
  if (r1.error) {
    return e(r1);
  }
  const shared_file_in_progress = r1.data;
  if (!shared_file_in_progress) {
    const r2 = await store.add_shared_file_save({
      url,
      file_id,
      name: file_name,
      user_id,
    });
    if (r2.error) {
      return e(r2);
    }
  }
  // if (shared_file_in_progress?.target_file_id) {
  //   return e(`${file_name} 已经和同名文件夹建立关联`);
  // }
  if (target_file_id) {
    // 直接根据网盘文件夹 id 和 shared_files 建立关联，这种是手动选择了网盘内的文件夹
    const r = await build_link_between_shared_files_with_folder(
      {
        target_file_id,
        name: file_name,
      },
      {
        user_id,
        store,
      }
    );
    if (r.error) {
      return e(r);
    }
    // 删除同名的、失效的关联关系
    store.delete_shared_file_save({
      file_id,
      user_id,
      // need_update: 1,
    });
    res.status(200).json({ code: 0, msg: "", data: null });
    return;
  }
  // 根据分享文件夹名称，去网盘内找同名文件夹并建立关联
  const r = await build_link_between_shared_files_with_folder(
    {
      name: file_name,
    },
    {
      user_id,
      store,
    }
  );
  if (r.error) {
    return e(r);
  }
  // 删除同名的，失效的关联关系
  store.delete_shared_file_save({
    file_id,
    name: file_name,
    user_id,
    // need_update: 1,
  });
  res.status(200).json({ code: 0, msg: "", data: null });
}
