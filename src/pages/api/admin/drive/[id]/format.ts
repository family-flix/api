/**
 * @file 格式化云盘
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Drive } from "@/domains/drive";
import { User } from "@/domains/user";
import { Folder } from "@/domains/folder";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id } = req.body as Partial<{ id: string }>;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  await store.prisma.tmp_file.deleteMany({
    where: {
      drive_id,
      user_id: user.id,
    },
  });
  await store.prisma.file.deleteMany({
    where: {
      drive_id,
      user_id: user.id,
    },
  });
  await store.prisma.parsed_tv.deleteMany({
    where: {
      drive_id,
      user_id: user.id,
    },
  });
  await store.prisma.parsed_movie.deleteMany({
    where: {
      drive_id,
      user_id: user.id,
    },
  });
  const folder = new Folder("root", {
    client: drive.client,
  });
  do {
    await (async () => {
      const r = await folder.next();
      if (r.error) {
        return;
      }
      const files = r.data;
      for (let i = 0; i < files.length; i += 1) {
        await drive.client.delete_file(files[i].id);
      }
    })();
  } while (folder.next_marker);
  return res.status(200).json({ code: 0, msg: "格式化成功", data: null });
}
