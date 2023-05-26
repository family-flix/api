/**
 * @file 建立同步任务（将分享文件夹和云盘内文件夹关联）
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { r_id } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { url, tv_id, file_id, file_name, target_file_id } = req.body as Partial<{
    url: string;
    tv_id: string;
    /** 分享文件夹 id */
    file_id: string;
    /** 分享文件夹名称(同时也会用这个名字去网盘中找同名的) */
    file_name: string;
    /** 云盘文件夹 file_id。如果指定了该参数，就不会使用 file_name 去网盘中找同名，直接使用该参数 */
    target_file_id: string;
  }>;
  // if (!file_id) {
  //   return e("缺少分享文件夹 id 参数");
  // }
  // if (!file_name) {
  //   return e("缺少分享文件夹名称参数");
  // }
  if (!url) {
    return e("缺少分享链接参数");
  }
  if (!tv_id) {
    return e("缺少电视剧 id");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;

  const sync_task = await store.prisma.bind_for_parsed_tv.findFirst({
    where: {
      url,
      user_id,
      parsed_tv: {
        tv: {
          id: tv_id,
        },
      },
    },
    include: {
      parsed_tv: {
        include: {
          tv: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });
  if (sync_task && sync_task.parsed_tv.tv) {
    const { name, original_name } = sync_task.parsed_tv.tv.profile;
    return e(Result.Err(`该 url 已经与 ${name || original_name} 建立了同步任务`));
  }
  console.log("tv", tv_id, user_id);
  const tv = await store.prisma.tv.findFirst({
    where: {
      id: tv_id,
      user_id,
    },
    include: {
      parsed_tvs: true,
    },
  });
  if (tv === null) {
    return e("没有匹配的电视剧记录");
  }
  const { parsed_tvs } = tv;
  if (parsed_tvs.length === 0) {
    return e("该电视剧没有可以关联的文件夹");
  }
  const random_drive_id = parsed_tvs[0].drive_id;
  const client = new AliyunDriveClient({ drive_id: random_drive_id, store });
  const r1 = await client.fetch_share_profile(url);
  if (r1.error) {
    return e(r1);
  }
  const { share_id } = r1.data;
  const files_res = await client.fetch_shared_files("root", {
    share_id,
  });
  if (files_res.error) {
    return e(files_res);
  }
  const files = files_res.data.items;
  const matched_folder = (() => {
    for (let i = 0; i < parsed_tvs.length; i += 1) {
      const parsed_tv = parsed_tvs[i];
      const matched = files.find((file) => {
        return file.type === "folder" && file.name === parsed_tv.file_name;
      });
      if (matched) {
        return { target_folder: parsed_tv, shared_folder: matched };
      }
    }
    return null;
  })();
  if (matched_folder === null) {
    return e(Result.Err("该分享没有和电视剧匹配的文件夹，请手动选择", "20001"));
  }
  await store.prisma.bind_for_parsed_tv.create({
    data: {
      id: r_id(),
      url,
      file_id: matched_folder.shared_folder.file_id,
      name: matched_folder.shared_folder.name,
      parsed_tv_id: matched_folder.target_folder.id,
      user_id,
    },
  });
  res.status(200).json({ code: 0, msg: "", data: null });
}
