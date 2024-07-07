/**
 * @file 新增或更新影片播放记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store/index";
import { MediaThumbnail } from "@/domains/media_thumbnail";
import { Member } from "@/domains/user/member";
import { Drive } from "@/domains/drive/v2";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";
import { r_id } from "@/utils";

const pending_unique: Record<string, unknown> = {};

export default async function v0_history_update(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    tv_id,
    season_id,
    episode_id,
    movie_id,
    file_id,
    current_time = 0,
    duration = 0,
  } = req.body as Partial<{
    tv_id: string;
    season_id: string;
    episode_id: string;
    movie_id: string;
    /** 剧集可能有多个源，这里还要传入具体播放的是哪个源 */
    file_id: string;
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
  if (!tv_id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  if (!season_id) {
    return e(Result.Err("缺少电视剧季 id"));
  }
  if (!episode_id) {
    return e(Result.Err("缺少剧集 id"));
  }
  const k = [season_id, member.id].join("/");
  if (pending_unique[k]) {
    return e(Result.Err("正在创建记录"));
  }
  // console.log(1, new Date().valueOf() - now);
  const tv_res = await MediaThumbnail.New({
    assets: app.assets,
  });
  if (tv_res.error) {
    return e(tv_res);
  }
  // console.log(2, new Date().valueOf() - now);
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
  const drive_res = await Drive.Get({ id: file.drive_id, user: member.user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const existing_history = await store.prisma.play_history.findFirst({
    where: {
      tv_id,
      member_id: member.id,
    },
    include: {
      episode: {
        include: {
          parsed_episodes: true,
        },
      },
    },
  });
  if (!existing_history) {
    const created_history_id = r_id();
    tv.snapshot_media({
      file_id,
      cur_time: current_time,
      drive,
      store,
      filename(time: string) {
        return `${season_id}-${time}`;
      },
    }).then((r) => {
      if (r.error) {
        // console.log(r.error.message);
        return;
      }
      store.update_history(created_history_id, {
        thumbnail: r.data.img_path,
      });
    });
    // if (thumbnail_res.error) {
    //   return e(thumbnail_res);
    // }
    pending_unique[k] = true;
    await store.prisma.play_history.create({
      data: {
        id: created_history_id,
        tv_id,
        season_id,
        episode_id,
        current_time,
        duration,
        member_id: member.id,
        file_id: file_id || null,
        thumbnail: null,
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
  tv.snapshot_media({
    file_id,
    cur_time: current_time,
    filename(time: string) {
      return `${season_id}-${time}`;
    },
    drive,
    store,
  }).then((r) => {
    if (r.error) {
      // console.log(r.error.message);
      return;
    }
    // console.log("[API]history/update - add thumbnail", r.data.img_path);
    store.update_history(existing_history.id, {
      thumbnail: r.data.img_path,
    });
    // console.log(r.data);
  });
  const data: Parameters<typeof store.prisma.play_history.update>[0]["data"] = {
    season_id,
    episode_id,
    current_time,
    file_id: file_id || null,
    thumbnail: null,
  };
  if (duration) {
    data.duration = duration;
  }
  const update_res = await store.update_history(existing_history.id, data);
  if (update_res.error) {
    return e(update_res);
  }
  // const { thumbnail: prev_thumbnail } = existing_history;
  // if (prev_thumbnail) {
  //   tv.delete_snapshot(prev_thumbnail);
  // }
  return res.status(200).json({
    code: 0,
    msg: "更新记录成功",
    data: null,
  });
}
