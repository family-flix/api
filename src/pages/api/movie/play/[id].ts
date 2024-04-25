/**
 * @file 获取电影详情加上当前正在播放的剧集信息
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  if (!id) {
    return e(Result.Err("缺少电影 id"));
  }
  const movie = await store.prisma.movie.findFirst({
    where: {
      id,
      user_id: member.user.id,
    },
    include: {
      profile: true,
      subtitles: true,
      play_histories: {
        where: {
          movie_id: id,
          member_id: member.id,
        },
      },
      parsed_movies: true,
    },
  });
  if (movie === null) {
    return e(Result.Err("没有匹配的电影记录"));
  }
  const { profile, play_histories, subtitles, parsed_movies } = movie;
  const play_history =
    play_histories.find((p) => {
      return p.movie_id === id && p.member_id === member.id;
    }) || null;
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
  const sources = parsed_movies.map((source) => {
    const { id, file_id, file_name, parent_paths } = source;
    return {
      id,
      file_id,
      file_name,
      parent_paths,
    };
  });
  const data = {
    id,
    name: name || original_name,
    overview,
    poster_path,
    popularity,
    current_time,
    thumbnail,
    sources,
    subtitles: subtitles.map((subtitle) => {
      const { id, file_id, name, language } = subtitle;
      return {
        type: 2,
        id,
        name,
        url: file_id,
        lang: language,
      };
    }),
    cur_source: (() => {
      const cur = sources.find((source) => {
        return source.file_id === file_id;
      });
      if (cur) {
        return cur;
      }
      const high = sources.find((source) => {
        return source.file_name.match(/(2016[pP])|4[kK]/);
      });
      if (high) {
        return high;
      }
      return sources[0] || null;
    })(),
  };
  res.status(200).json({ code: 0, msg: "", data });
}
