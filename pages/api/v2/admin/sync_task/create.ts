/**
 * @file 建立同步任务（将分享文件夹和云盘内文件夹关联）
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { DriveTypes } from "@/domains/drive/constants";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { FileType, ResourceSyncTaskStatus } from "@/constants";
import { r_id } from "@/utils";
import { initial_share_client } from "@/store/share_resource";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { url, pwd, resource_file_id, resource_file_name, drive_file_id, drive_file_name, drive_id } =
    req.body as Partial<{
      url: string;
      pwd: string;
      resource_file_id: string;
      resource_file_name: string;
      drive_file_id: string;
      drive_file_name: string;
      drive_id: string;
    }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!url) {
    return e(Result.Err("缺少分享资源链接"));
  }
  const id_r = url.match(/\/s\/([0-9a-zA-Z]{11})/);
  if (!id_r) {
    return e(Result.Err("不是合法的资源链接"));
  }
  if (!resource_file_id || !resource_file_name) {
    return e(Result.Err("请选择资源文件夹"));
  }
  // if (files.length === 1) {
  //   const sync_task = await store.prisma.resource_sync_task.findFirst({
  //     where: {
  //       url,
  //       file_id: files[0].file_id,
  //       user_id: user.id,
  //     },
  //   });
  //   if (sync_task) {
  //     return e(Result.Err("该分享资源已有同步任务"));
  //   }
  // }
  if (!drive_file_id && !drive_file_name) {
    // const share_client_r = await initial_share_client(user);
    // if (share_client_r.error) {
    //   return e(share_client_r.error.message);
    // }
    // const share_client = share_client_r.data;
    // const token_r = await share_client.fetch_share_profile(url, {
    //   code: pwd,
    // });
    // if (token_r.error) {
    //   return e(Result.Err(token_r.error.message));
    // }
    // const files_r = await share_client.fetch_files();
    // if (files_r.error) {
    //   return e(Result.Err(files_r.error.message));
    // }
    // const files = files_r.data.items;

    const the_file_in_drive = await store.prisma.file.findFirst({
      where: {
        name: resource_file_name,
        user_id: user.id,
      },
    });
    if (!the_file_in_drive) {
      return e(Result.Err("没有同名文件夹，请手动选择云盘内文件夹", 20001));
    }
    // const { drive_id } = the_file_in_drive;
    // const drive_res = await Drive.Get({ id: drive_id, user, store });
    // if (drive_res.error) {
    //   return e(Result.Err(drive_res.error.message));
    // }
    // const client = drive_res.data.client;
    // const r1 = await client.fetch_share_profile(url);
    // if (r1.error) {
    //   return e(Result.Err(r1.error.message));
    // }
    const existing = await store.prisma.resource_sync_task.findFirst({
      where: {
        url,
        file_id: resource_file_id,
        user_id: user.id,
      },
    });
    if (existing) {
      return e(Result.Err("已经存在相同的同步任务了"));
    }
    await store.prisma.resource_sync_task.create({
      data: {
        id: r_id(),
        status: ResourceSyncTaskStatus.WaitSetProfile,
        url,
        file_id: resource_file_id,
        name: resource_file_name,
        file_id_link_resource: the_file_in_drive.file_id,
        file_name_link_resource: the_file_in_drive.name,
        invalid: 0,
        user_id: user.id,
        drive_id: the_file_in_drive.drive_id,
      },
    });
    res.status(200).json({
      code: 0,
      msg: "新增同步任务成功",
      data: null,
    });
    return;
  }
  // 手动选择了转存的文件夹和云盘内文件夹进行关联
  if (resource_file_id && resource_file_name && drive_file_id && drive_file_name && drive_id) {
    await store.prisma.resource_sync_task.create({
      data: {
        id: r_id(),
        url,
        file_id: resource_file_id,
        name: resource_file_name,
        file_id_link_resource: drive_file_id,
        file_name_link_resource: drive_file_name,
        invalid: 0,
        user: {
          connect: {
            id: user.id,
          },
        },
        drive: {
          connect: {
            id: drive_id,
          },
        },
      },
    });
    res.status(200).json({
      code: 0,
      msg: "新增同步任务成功",
      data: {},
    });
    return;
  }
  // 默认情况，仅输入一个链接
  const random_drive_id_res = await (async () => {
    if (drive_id) {
      return Result.Ok(drive_id);
    }
    const drive = await store.prisma.drive.findFirst({
      where: {
        type: DriveTypes.AliyunBackupDrive,
        user_id: user.id,
      },
    });
    if (!drive) {
      return Result.Err("请先添加阿里云盘");
    }
    return Result.Ok(drive.id);
  })();
  if (random_drive_id_res.error) {
    return e(random_drive_id_res);
  }
  const random_drive_id = random_drive_id_res.data;
  const drive_res = await Drive.Get({ id: random_drive_id, user, store });
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
  const resource = resource_files[0];
  const drive_file_res = await (async () => {
    if (drive_file_id && drive_id) {
      // 给指定文件夹关联资源
      const drive_file = await store.prisma.file.findFirst({
        where: {
          file_id: drive_file_id,
          drive_id: drive_id,
          user_id: user.id,
        },
      });
      if (!drive_file) {
        return Result.Err("没有匹配的文件");
      }
      if (resource.name === drive_file.name) {
        return Result.Ok({
          file: drive_file,
          resource,
        });
      }
      const matched = resource_files.find((resource_file) => {
        return resource_file.type === "folder" && resource_file.name === drive_file.name;
      });
      if (matched) {
        return Result.Ok({
          file: drive_file,
          resource: matched,
        });
      }
      return Result.Err("该分享没有和电视剧匹配的文件夹，请手动选择", 20001, resource_files);
    }
    const drive_file = await store.prisma.file.findFirst({
      where: {
        name: resource.name,
        user_id: user.id,
      },
    });
    if (drive_file) {
      return Result.Ok({
        file: drive_file,
        resource,
      });
    }
    return Result.Err("该分享没有和电视剧匹配的文件夹，请手动选择", 20001, resource_files);
  })();
  if (drive_file_res.error) {
    return e(drive_file_res);
  }
  const payload = drive_file_res.data;
  await store.prisma.resource_sync_task.create({
    data: {
      id: r_id(),
      status: ResourceSyncTaskStatus.WaitSetProfile,
      url,
      file_id: payload.resource.file_id,
      name: payload.resource.name,
      file_id_link_resource: payload.file.file_id,
      file_name_link_resource: payload.file.name,
      invalid: 0,
      user_id: user.id,
      drive_id: payload.file.drive_id,
    },
  });
  res.status(200).json({
    code: 0,
    msg: "新增同步任务成功",
    data: null,
  });
}
