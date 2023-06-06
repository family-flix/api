/**
 * @file 建立同步任务（将分享文件夹和云盘内文件夹关联）
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { r_id } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { url, tv_id, target_file_id } = req.body as Partial<{
    url: string;
    tv_id: string;
    /** 云盘文件夹 file_id。如果指定了该参数，就不会使用 file_name 去网盘中找同名，直接使用该参数 */
    target_file_id: string;
  }>;
  if (!url) {
    return e("缺少分享资源链接");
  }
  if (!tv_id) {
    return e("缺少电视剧 id");
  }
  const t_res = await User.New(authorization, store);
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
    return e(Result.Err(`该分享资源已经与 ${name || original_name} 建立了更新任务`));
  }
  // console.log("tv", tv_id, user_id);
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
  const drive_res = await Drive.Get({ id: random_drive_id, user_id, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const client = drive.client;
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
  const matched_folder_res = await (async () => {
    // 外部传入了云盘文件夹 id,指定要存到这个文件夹随
    if (files.length === 1 && target_file_id) {
      const parsed_tv_res = await store.find_parsed_tv({
        file_id: target_file_id,
      });
      if (parsed_tv_res.error) {
        return Result.Err(parsed_tv_res.error);
      }
      const parsed_tv = parsed_tv_res.data;
      if (!parsed_tv) {
        return Result.Err("不存在匹配的云盘文件夹");
      }
      const { id } = parsed_tv;
      return Result.Ok({
        target_folder: {
          id,
        },
        shared_folder: files[0],
      });
    }
    for (let i = 0; i < parsed_tvs.length; i += 1) {
      const parsed_tv = parsed_tvs[i];
      const matched = files.find((file) => {
        return file.type === "folder" && file.name === parsed_tv.file_name;
      });
      if (matched) {
        return Result.Ok({ target_folder: parsed_tv, shared_folder: matched });
      }
    }
    return Result.Err(
      "该分享没有和电视剧匹配的文件夹，请手动选择",
      20001,
      parsed_tvs
        .filter((folder) => {
          return !!folder.file_id;
        })
        .map((folder) => {
          const { id, file_id, file_name } = folder;
          return {
            id,
            file_id,
            file_name,
          };
        })
    );
  })();
  if (matched_folder_res.error) {
    return e(matched_folder_res);
  }
  // if (matched_folder === null) {
  //   return e(Result.Err("该分享没有和电视剧匹配的文件夹，请手动选择", "20001"));
  // }
  const matched_folder = matched_folder_res.data;
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
  res.status(200).json({ code: 0, msg: "创建更新任务成功", data: null });
}
