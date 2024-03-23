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
    media_id,
    media_source_id,
    source_id,
    current_time = 0,
    duration = 0,
  } = req.body as Partial<{
    media_id: string;
    media_source_id: string;
    source_id: string;
    current_time: number;
    duration: number;
    updated: string;
    created: string;
  }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  if (!media_id) {
    return e(Result.Err("缺少电视剧季 id"));
  }
  if (!media_source_id) {
    return e(Result.Err("缺少剧集 id"));
  }
  const k = [media_id, member.id].join("/");
  if (pending_unique[k]) {
    return e(Result.Err("正在创建记录"));
  }
  const thumbnail_res = await MediaThumbnail.New({
    assets: app.assets,
  });
  if (thumbnail_res.error) {
    return e(Result.Err(thumbnail_res.error.message));
  }
  // console.log(2, new Date().valueOf() - now);
  const thumbnail_creator = thumbnail_res.data;
  const media = await store.prisma.media.findFirst({
    where: {
      id: media_id,
    },
    include: {
      profile: true,
    },
  });
  if (!media) {
    return e(Result.Err("没有匹配的视频记录1"));
  }
  const media_source = await store.prisma.media_source.findFirst({
    where: {
      id: media_source_id,
    },
    include: {
      profile: true,
    },
  });
  if (!media_source) {
    return e(Result.Err("没有匹配的视频记录2"));
  }
  const file = await store.prisma.parsed_media_source.findFirst({
    where: {
      id: source_id,
    },
  });
  if (!file) {
    return e(Result.Err("没有匹配的视频源"));
  }
  const { file_id } = file;
  const drive_res = await Drive.Get({ id: file.drive_id, user: member.user, store });
  if (drive_res.error) {
    return e(Result.Err(drive_res.error.message));
  }
  const drive = drive_res.data;
  function create_thumbnail(history_id: string) {
    thumbnail_creator
      .snapshot_media({
        file_id,
        cur_time: current_time,
        drive,
        store,
        filename(time: string) {
          return `${media_id}-${time}`;
        },
      })
      .then(async (r) => {
        if (r.error) {
          return;
        }
        await store.prisma.play_history_v2.update({
          where: {
            id: history_id,
          },
          data: {
            thumbnail_path: r.data.img_path,
          },
        });
      });
  }
  // (async () => {
  //   const diary = await store.prisma.member_diary.findFirst({
  //     where: {
  //       media_source_id,
  //       day: dayjs().format("YYYY-MM-DD"),
  //       member_id: member.id,
  //     },
  //   });
  //   if (diary) {
  //     return;
  //   }
  //   await store.prisma.member_diary.create({
  //     data: {
  //       id: r_id(),
  //       media_source_id,
  //       day: dayjs().format("YYYY-MM-DD"),
  //       member_id: member.id,
  //     },
  //   });
  // })();
  const existing_history = await store.prisma.play_history_v2.findFirst({
    where: {
      media_id,
      member_id: member.id,
    },
  });
  if (!existing_history) {
    const created_history_id = r_id();
    create_thumbnail(created_history_id);
    pending_unique[k] = true;
    await store.prisma.play_history_v2.create({
      data: {
        id: created_history_id,
        text: (() => {
          const { name } = media.profile;
          const { order } = media_source.profile;
          return `${name}/${order}`;
        })(),
        current_time,
        duration,
        thumbnail_path: null,
        member_id: member.id,
        file_id: source_id || null,
        media_id,
        media_source_id,
      },
    });
    delete pending_unique[k];
    // console.log(4, new Date().valueOf() - now);
    return res.status(200).json({
      code: 0,
      msg: "新增记录成功",
      data: null,
    });
  }
  // console.log("[PAGE]history/update - thumbnail", thumbnail_res.data);
  create_thumbnail(existing_history.id);
  const data: Parameters<typeof store.prisma.play_history_v2.update>[0]["data"] = {
    text: (() => {
      const { name } = media.profile;
      const { order } = media_source.profile;
      return `${name}/${order}`;
    })(),
    current_time,
    thumbnail_path: null,
    updated: dayjs().toISOString(),
    media_id,
    media_source_id,
    file_id: source_id || null,
  };
  if (duration) {
    data.duration = duration;
  }
  await store.prisma.play_history_v2.update({
    where: {
      id: existing_history.id,
    },
    data,
  });
  res.status(200).json({
    code: 0,
    msg: "更新记录成功",
    data: null,
  });
}
