/**
 * @file 获取分享文件列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { DriveTypes } from "@/domains/drive/constants";
import { AliyunShareResourceClient } from "@/domains/clients/aliyun_resource";
import { DataStore } from "@/domains/store/types";
import { response_error_factory } from "@/utils/server";
import { Result } from "@/types/index";
import { r_id } from "@/utils/index";

async function get_drive_client(values: { user: User; store: DataStore }) {
  const { user, store } = values;
  // 取第一个云盘用来获取分享文件列表，不涉及转存逻辑
  const drive = await store.prisma.drive.findFirst({
    where: {
      type: DriveTypes.AliyunResourceDrive,
      user_id: user.id,
    },
  });
  if (!drive) {
    return Result.Err("请先添加一个云盘", 10002);
  }
  return Result.Ok(drive);
}

export default async function v2_admin_resource_files(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    url,
    code = null,
    file_id: parent_file_id = "root",
    next_marker = "initial",
  } = req.body as Partial<{
    url: string;
    code: string;
    file_id: string;
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
  const r = await get_drive_client({ user, store });
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  const drive = r.data;
  // @todo 即使获取一个文件夹内的文件，也会多次调用 fetch_profile 来获取 share_token，怎么尽量复用有效的 share_token？
  const r3 = await AliyunShareResourceClient.Get({
    id: drive.id,
    url,
    code,
    user,
    store,
  });
  // console.log("[API]v2/admin/resource - after AliyunShareResourceClient.Get");
  if (r3.error) {
    return Result.Err(r3.error.message);
  }
  const client = r3.data;
  (async () => {
    // 保存查询记录
    if (parent_file_id !== "root") {
      return;
    }
    const existing = await store.prisma.shared_file.findFirst({
      where: {
        url,
        user_id: user.id,
      },
    });
    if (existing) {
      return;
    }
    await store.prisma.shared_file.create({
      data: {
        id: r_id(),
        url,
        pwd: code,
        user_id: user.id,
      },
    });
  })();
  const r4 = await client.fetch_files(parent_file_id, {
    marker: next_marker,
  });
  if (r4.error) {
    return e(Result.Err(r4.error.message));
  }
  const data = r4.data;
  return res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
