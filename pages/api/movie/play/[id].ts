/**
 * @file 获取电影详情加上当前正在播放的剧集信息
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少电影 id");
  }
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: member_id, user } = t_res.data;
  const movie = await store.prisma.movie.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      profile: true,
      play_history: true,
      parsed_movies: true,
    },
  });
  if (movie === null) {
    return e("没有匹配的电影记录");
  }
  const { profile, play_history, parsed_movies } = movie;
  console.log("play_history", play_history);
  const { current_time, thumbnail, file_id } = await (async () => {
    if (play_history === null) {
      const r = {
        current_time: 0,
        thumbnail: null,
        file_id: null,
      };
      return r;
    }
    const { current_time, thumbnail, file_id } = play_history;
    const r = {
      current_time,
      thumbnail,
      file_id,
    };
    return r;
  })();
  const { name, original_name, overview, poster_path, popularity } = profile;
  console.log("file_id", file_id);
  const data = {
    id,
    name: name || original_name,
    overview,
    poster_path,
    popularity,
    current_time,
    thumbnail,
    sources: parsed_movies,
    cur_source: (() => {
      const cur = parsed_movies.find((source) => {
        return source.file_id === file_id;
      });
      if (cur) {
        return cur;
      }
      const high = parsed_movies.find((source) => {
        return source.file_name.match(/(2016[pP])|4[kK]/);
      });
      if (high) {
        return high;
      }
      return parsed_movies[0] ?? null;
    })(),
  };
  res.status(200).json({ code: 0, msg: "", data });
}
