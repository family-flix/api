/**
 * @file 管理后台/给指定的同步任务关联分享资源
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { ResourceSyncTask } from "@/domains/resource_sync_task";
import { Drive } from "@/domains/drive";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const { url, resource_file_id, resource_file_name } = req.body as Partial<{
    url: string;
    resource_file_id: string;
    resource_file_name: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少同步任务 id"));
  }
  if (!url) {
    return e(Result.Err("缺少资源 url"));
  }
  const sync_task = await store.prisma.bind_for_parsed_tv.findFirst({
    where: {
      id,
      user_id: user.id,
    },
  });
  if (!sync_task) {
    return e(Result.Err("没有匹配的记录"));
  }
  const duplicated_sync_task = await store.prisma.bind_for_parsed_tv.findFirst({
    where: {
      url,
      OR: [
        {
          in_production: 1,
        },
        {
          invalid: 0,
        },
      ],
      user_id: user.id,
    },
  });
  if (duplicated_sync_task) {
    return e(
      Result.Err(`该分享资源已关联文件夹`, 40001, {
        id: duplicated_sync_task.id,
      })
    );
  }
  /**
   * 手动指定了要关联的分享资源
   */
  if (resource_file_id && resource_file_name) {
    await store.prisma.bind_for_parsed_tv.update({
      where: {
        id: sync_task.id,
      },
      data: {
        updated: dayjs().toISOString(),
        invalid: 0,
        url,
        file_id: resource_file_id,
        name: resource_file_name,
      },
    });
    res.status(200).json({ code: 0, msg: "更新成功", data: {} });
    return;
  }
  const drive_res = await Drive.Get({ id: sync_task.drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const r1 = await drive.client.fetch_share_profile(url);
  if (r1.error) {
    return e(r1);
  }
  const { share_id } = r1.data;
  const files_res = await drive.client.fetch_shared_files("root", {
    share_id,
  });
  if (files_res.error) {
    return e(files_res);
  }
  const resource_files = files_res.data.items;
  if (resource_files.length === 0) {
    return e(Result.Err("该分享没有包含文件夹"));
  }
  if (resource_files.length !== 1) {
    return e(
      Result.Err(
        "该分享包含多个文件夹，请手动选择要转存的文件夹",
        40004,
        resource_files.map((file) => {
          const { name, file_id, type } = file;
          return {
            name,
            file_id,
            type,
          };
        })
      )
    );
  }
  const resource = resource_files[0];
  await store.prisma.bind_for_parsed_tv.update({
    where: {
      id: sync_task.id,
    },
    data: {
      updated: dayjs().toISOString(),
      invalid: 0,
      url,
      file_id: resource.file_id,
      name: resource.name,
    },
  });
  res.status(200).json({ code: 0, msg: "更新成功", data: {} });
}
