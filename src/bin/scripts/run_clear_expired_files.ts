/**
 * @file 清除所有无效的文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { FileRecord, ModelParam, ModelQuery } from "@/domains/store/types";
import { store } from "@/store";
import { to_number } from "@/utils/primitive";
import { clear_expired_files_in_drive, Drive } from "@/domains/drive";
import { sleep } from "@/utils";

async function main() {
  const drives = await store.prisma.drive.findMany({});
  const t_res = await User.New("", store);
  if (t_res.error) {
    return;
  }
  const user = t_res.data;
  for (let i = 0; i < drives.length; i += 1) {
    await clear_expired_files_in_drive({ drive_id: drives[i].id, user, store });
  }
}

main();
