/**
 * @file 获取分享文件列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { AliyunDriveClient } from "@/domains/aliyundrive";
import { User } from "@/domains/user";
import { store } from "@/store";
import { response_error_factory } from "@/utils/backend";
import { BaseApiResp } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    url,
    file_id: parent_file_id = "root",
    next_marker = "initial",
  } = req.query as Partial<{
    url: string;
    file_id: string;
    next_marker: string;
  }>;
  if (!url) {
    return e("缺少分享链接参数");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const drives_resp = await store.find_aliyun_drive({ user_id });
  // const drives_resp = await prisma.drive.findFirst({
  //   where: {
  //     user_id,
  //   },
  // });
  // if (drives_resp === null) {
  //   return e("还未添加网盘，请先前往添加网盘");
  // }
  const drive = drives_resp.data;
  const client = new AliyunDriveClient({ drive_id: drive.id, store });
  const r1 = await client.prepare_fetch_shared_files(url);
  if (r1.error) {
    return r1;
  }
  const { share_id, share_title } = r1.data;
  if (parent_file_id === "root") {
    store.add_shared_files_safely({
      url,
      title: share_title,
      user_id,
    });
  }
  const r2 = await client.fetch_shared_files(parent_file_id, {
    marker: next_marker,
    share_id,
  });
  if (r2.error) {
    return e(r2);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: r2.data,
  });
}
