/**
 * @file 新增或更新影片播放记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { MediaThumbnail } from "@/domains/media_thumbnail";
import { Member } from "@/domains/user/member";
import { Drive } from "@/domains/drive";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { app, store } from "@/store";
import { r_id } from "@/utils";

const pending_unique: Record<string, unknown> = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    movie_id,
    file_id,
    current_time = 0,
    duration = 0,
  } = req.body as Partial<{
    movie_id: string;
    file_id: string;
    current_time: number;
    duration: number;
  }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!movie_id) {
    return e("缺少电视剧 id");
  }
  const member = t_res.data;
  const k = [movie_id, member.id].join("/");
  if (pending_unique[k]) {
    return e(Result.Err("正在创建记录"));
  }
  const tv_res = await MediaThumbnail.New({
    assets: app.assets,
  });
  if (tv_res.error) {
    return e(tv_res);
  }
  const tv = tv_res.data;
  const file_res = await store.find_file({
    file_id,
  });
  if (file_res.error) {
    return e(file_res);
  }
  const file = file_res.data;
  if (!file) {
    return e(Result.Err("没有匹配的视频源"));
  }
  (async () => {
    const diary = await store.prisma.member_diary.findFirst({
      where: {
        movie_id,
        day: dayjs().format("YYYY-MM-DD"),
        member_id: member.id,
      },
    });
    if (diary) {
      return;
    }
    await store.prisma.member_diary.create({
      data: {
        id: r_id(),
        movie_id,
        day: dayjs().format("YYYY-MM-DD"),
        member_id: member.id,
      },
    });
  })();
  const existing_history = await store.prisma.play_history.findFirst({
    where: {
      movie_id,
      member_id: member.id,
    },
    include: {
      movie: {
        include: {
          parsed_movies: true,
        },
      },
    },
  });
  const { drive_id } = file;
  const drive_res = await Drive.Get({ id: drive_id, user: member.user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  if (!existing_history) {
    const created_movie_id = r_id();
    tv.snapshot_media({
      file_id,
      drive,
      cur_time: current_time,
      store,
      filename(time) {
        return `${movie_id}-${time}`;
      },
    }).then(async (r) => {
      if (r.error) {
        return;
      }
      await store.prisma.play_history.update({
        where: {
          id: created_movie_id,
        },
        data: {
          thumbnail: r.data.img_path,
        },
      });
    });
    pending_unique[k] = true;
    await store.prisma.play_history.create({
      data: {
        id: created_movie_id,
        movie_id,
        current_time,
        duration,
        member_id: member.id,
        file_id: file_id ?? null,
      },
    });
    delete pending_unique[k];
    return res.status(200).json({
      code: 0,
      msg: "新增记录成功",
      data: null,
    });
  }
  tv.snapshot_media({
    file_id,
    cur_time: current_time,
    filename(time) {
      return `${movie_id}-${time}`;
    },
    drive,
    store,
  }).then(async (r) => {
    if (r.error) {
      return;
    }
    await store.prisma.play_history.update({
      where: {
        id: existing_history.id,
      },
      data: {
        thumbnail: r.data.img_path,
      },
    });
  });
  const update_res = await store.update_history(existing_history.id, {
    current_time,
    file_id: file_id ?? null,
  });
  if (update_res.error) {
    return e(update_res);
  }
  res.status(200).json({
    code: 0,
    msg: "更新记录成功",
    data: null,
  });
}
