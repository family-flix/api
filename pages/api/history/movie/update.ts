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
import { parseJSONStr } from "@/utils";
import { Drive } from "@/domains/drive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    movie_id: movie_id,
    file_id,
    current_time = 0,
    duration = 0,
  } = req.body as Partial<{
    movie_id: string;
    file_id: string;
    current_time: number;
    duration: number;
  }>;
  if (!movie_id) {
    return e("缺少电视剧 id");
  }
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: member_id, user } = t_res.data;
  // const existing_history_res = await store.find_history({});
  const existing_history = await store.prisma.play_history.findFirst({
    where: {
      movie_id,
      member_id,
    },
    include: {
      movie: {
        include: {
          parsed_movies: true,
        },
      },
    },
  });
  // if (existing_history_res.error) {
  //   return e(existing_history_res);
  // }
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
    const drive_res = await Drive.Get({ id: drive_id, user_id: user.id, store });
    if (drive_res.error) {
      return e(drive_res);
    }
    const drive = drive_res.data;
    if (!drive) {
      return e("没有匹配的云盘记录");
    }
    // const thumbnail_res = await tv.snapshot_media({
    //   file_id,
    //   drive_id: drive.profile.drive_id,
    //   cur_time: current_time,
    //   store,
    // });
    // if (thumbnail_res.error) {
    //   return e(thumbnail_res);
    // }
    const adding_res = await store.add_history({
      movie_id,
      current_time,
      duration,
      member_id,
      file_id: file_id ?? null,
      // thumbnail: thumbnail_res.data?.img_path ?? null,
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
  const drive_res = await Drive.Get({ id: drive_id, user_id: user.id, store });
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
  //   drive_id: drive.profile.drive_id,
  //   cur_time: current_time,
  //   store,
  // });
  // if (thumbnail_res.error) {
  //   return e(thumbnail_res);
  // }
  // console.log("[PAGE]history/update - thumbnail", thumbnail_res.data);
  const update_res = await store.update_history(existing_history.id, {
    current_time,
    file_id: file_id ?? null,
    // thumbnail: thumbnail_res.data?.img_path ?? null,
  });
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
