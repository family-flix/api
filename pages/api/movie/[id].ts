/**
 * @file 获取电影详情
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { Drive } from "@/domains/drive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, type } = req.query as Partial<{ id: string; type: string }>;
  if (!id) {
    return e("缺少电影 id");
  }
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const movie = await store.prisma.movie.findFirst({
    where: {
      id,
    },
    include: {
      profile: true,
      parsed_movies: true,
    },
  });
  if (movie === null) {
    return e("没有匹配的电影记录");
  }
  const { profile, parsed_movies } = movie;
  const { name, original_name, overview, poster_path, popularity } = profile;
  const source = (() => {
    if (parsed_movies.length === 0) {
      return null;
    }
    const matched = parsed_movies.find((parsed_movie) => {
      const { file_name } = parsed_movie;
      if (file_name.includes("4K") || file_name.includes("超清")) {
        return true;
      }
      return false;
    });
    if (matched) {
      return matched;
    }
    return parsed_movies[0];
  })();
  if (source === null) {
    return e("该影片没有可播放的视频源");
  }
  const { file_id, drive_id } = source;
  console.log("fetch drive of source", drive_id, file_id);
  const drive_res = await Drive.Get({ id: drive_id, user_id: member.user.id, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const client = drive.client;
  const play_info_res = await client.fetch_video_preview_info(file_id);
  if (play_info_res.error) {
    return e(play_info_res);
  }
  if (play_info_res.data.length === 0) {
    return e("该影片暂时不可播放，请等待一段时间后重试");
  }
  const file_profile_res = await client.fetch_file(file_id);
  if (file_profile_res.error) {
    return e(file_profile_res);
  }
  const { thumbnail } = file_profile_res.data;
  type MediaFile = Partial<{
    id: string;
    name: string;
    overview: string;
    file_id: string;
    thumbnail: string;
    url: string;
    type: string;
    width: number;
    height: number;
  }>;
  const recommend = (() => {
    // 只有一种分辨率，直接返回该分辨率视频
    if (play_info_res.data.length === 1) {
      return play_info_res.data[0];
    }
    const matched_resolution = play_info_res.data.find((r) => {
      return r.type === type;
    });
    if (matched_resolution) {
      return matched_resolution;
    }
    return play_info_res.data[0];
  })();
  if (recommend.url.includes("x-oss-additional-headers=referer")) {
    return e("视频文件无法播放，请修改 refresh_token");
  }
  (() => {
    const { url, type, width, height } = recommend;
    const result: MediaFile & { other: MediaFile[] } = {
      id,
      name: name || undefined,
      overview: overview || "",
      file_id,
      url,
      thumbnail,
      type,
      width,
      height,
      // 其他分辨率的视频源
      other: play_info_res.data.map((res) => {
        const { url, type, width, height } = res;
        return {
          id: file_id,
          file_id,
          url,
          thumbnail,
          type,
          width,
          height,
        };
      }),
    };
    res.status(200).json({ code: 0, msg: "", data: result });
  })();
}
