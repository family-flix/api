/**
 * @file 新增或更新影片播放记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { TV } from "@/domains/tv";
import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { app, store } from "@/store";
import { r_id } from "@/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    tv_id,
    episode_id,
    file_id,
    current_time = 0,
    duration = 0,
    created,
    updated,
  } = req.body as Partial<{
    tv_id: string;
    episode_id: string;
    /** 剧集可能有多个源，这里还要传入具体播放的是哪个源 */
    file_id: string;
    current_time: number;
    duration: number;
    updated: string;
    created: string;
  }>;
  if (!tv_id) {
    return e("缺少电视剧 id");
  }
  if (!episode_id) {
    return e("缺少影片 id");
  }
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: member_id } = t_res.data;
  const existing_history = await store.prisma.play_history.findFirst({
    where: {
      tv_id,
      // 这里不能传 episode_id，当前是 E01，更新成 E02 时，用 E02 去找就有问题
      // episode_id,
      member_id,
    },
    include: {
      episode: {
        include: {
          parsed_episodes: true,
        },
      },
    },
  });
  const tv_res = await TV.New({
    assets: app.assets,
  });
  if (tv_res.error) {
    return e(tv_res);
  }
  const tv = tv_res.data;
  if (!existing_history) {
    const file_res = await store.find_file({
      file_id,
    });
    if (file_res.error) {
      return e(file_res);
    }
    const file = file_res.data;
    if (!file) {
      return e("没有匹配的视频源");
    }
    const { drive_id } = file;
    const drive_res = await store.find_drive({ id: drive_id });
    if (drive_res.error) {
      return e(drive_res);
    }
    const drive = drive_res.data;
    if (!drive) {
      return e("没有匹配的云盘记录");
    }
    // const thumbnail_res = await tv.snapshot_media({
    //   file_id,
    //   drive_id: drive.drive_id,
    //   cur_time: current_time,
    //   store,
    // });
    // if (thumbnail_res.error) {
    //   return e(thumbnail_res);
    // }
    const adding_res = await store.add_history({
      tv_id,
      episode_id,
      current_time,
      duration,
      member_id,
      file_id: file_id ?? null,
      thumbnail: null,
    });
    if (adding_res.error) {
      return e(adding_res);
    }
    return res.status(200).json({
      code: 0,
      msg: "新增记录成功",
      data: null,
    });
  }
  const file_res = await store.find_file({
    file_id,
  });
  if (file_res.error) {
    return e(file_res);
  }
  const file = file_res.data;
  if (!file) {
    return e("没有匹配的视频源");
  }
  const { drive_id } = file;
  const drive_res = await store.find_drive({ id: drive_id });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  if (!drive) {
    return e("没有匹配的云盘记录");
  }
  // console.log("[PAGE]history/update - prepare snapshot_media", file_id, drive.drive_id, current_time);
  // const thumbnail_res = await tv.snapshot_media({
  //   file_id,
  //   drive_id: drive.drive_id,
  //   cur_time: current_time,
  //   store,
  // });
  // if (thumbnail_res.error) {
  //   return e(thumbnail_res);
  // }
  // console.log("[PAGE]history/update - thumbnail", thumbnail_res.data);
  const data: Parameters<typeof store.prisma.play_history.update>[0]["data"] = {
    episode_id,
    current_time,
    file_id: file_id ?? null,
    thumbnail: null,
  };
  if (duration) {
    data.duration = duration;
  }
  const update_res = await store.update_history(existing_history.id, data);
  if (update_res.error) {
    return e(update_res);
  }
  const { thumbnail: prev_thumbnail } = existing_history;
  if (prev_thumbnail) {
    tv.delete_snapshot(prev_thumbnail);
  }
  res.status(200).json({
    code: 0,
    msg: "更新记录成功",
    data: null,
  });
}

function format_number_with_3decimals(number: number) {
  // 将数字转换为字符串
  let numberString = number.toString();

  // 检查小数部分
  let decimalIndex = numberString.indexOf(".");
  let decimalPart = "";
  if (decimalIndex !== -1) {
    decimalPart = numberString.substring(decimalIndex + 1);
  }

  // 如果小数部分为空，则补充3个0
  if (decimalPart === "") {
    decimalPart = "000";
  }

  // 如果小数部分超过3位，则截取前3位
  if (decimalPart.length > 3) {
    decimalPart = decimalPart.substring(0, 3);
  }

  // 补充缺少的0
  while (decimalPart.length < 3) {
    decimalPart += "0";
  }

  // 构建最终结果
  let result = numberString;
  if (decimalIndex === -1) {
    result += ".";
  }
  result += decimalPart;

  return result;
}
